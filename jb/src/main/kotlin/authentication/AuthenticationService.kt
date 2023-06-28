package com.codestream.authentication

import com.codestream.agent.ApiVersionCompatibility
import com.codestream.agent.DidChangeApiVersionCompatibilityNotification
import com.codestream.agentService
import com.codestream.codeStream
import com.codestream.extensions.merge
import com.codestream.gson
import com.codestream.protocols.agent.Ide
import com.codestream.protocols.agent.LoginResult
import com.codestream.protocols.agent.LoginWithTokenParams
import com.codestream.protocols.webview.BootstrapResponse
import com.codestream.protocols.webview.Capabilities
import com.codestream.protocols.webview.DidChangeApiVersionCompatibility
import com.codestream.protocols.webview.UserSession
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settings.SettingsService
import com.codestream.settingsService
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.set
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.future.await

enum class SaveTokenReason {
    COPY,
    LOGIN_SUCCESS,
    LOGOUT,
    LOGIN_ERROR,
    AUTO_SIGN_IN,
}

class AuthenticationService(val project: Project) {

    private val extensionCapabilities: JsonElement get() = gson.toJsonTree(Capabilities())
    private val appSettings = ServiceManager.getService(ApplicationSettingsService::class.java)

    private val logger = Logger.getInstance(AuthenticationService::class.java)
    private var mergedCapabilities: JsonElement = extensionCapabilities
    private var apiVersionCompatibility: ApiVersionCompatibility? = null
    private var missingCapabilities: JsonObject? = null

    fun bootstrap(): BootstrapResponse? {
        val settings = project.settingsService ?: return null
        val session = project.sessionService ?: return null

        return BootstrapResponse(
            UserSession(session.userLoggedIn?.userId, session.eligibleJoinCompanies),
            mergedCapabilities,
            appSettings.webViewConfigs,
            settings.getWebViewContextJson(),
            appSettings.extensionInfo.versionFormatted,
            Ide,
            apiVersionCompatibility,
            missingCapabilities
        )
    }

    private fun resolveToken(settings: SettingsService): String? {
        val credentialAttributes = settings.credentialAttributes()
        PasswordSafe.instance.getPassword(credentialAttributes)?.let {
            logger.info("Auto sign-in password safe found settings.credentialAttributes()")
            return it
        }

        val credentialAttributesNoTeam = settings.credentialAttributes(false)
        PasswordSafe.instance.getPassword(credentialAttributesNoTeam)?.let {
            logger.info("Auto sign-in password safe found using settings.credentialAttributes(false)")
            return it
        }
        return null
    }

    /**
     * Attempts to auto-sign in using a token stored in the password safe. Returns false
     * only if the token login fails or in case of an exception. If the auto-login fails for
     * other reasons such as an error retrieving the token, it will log the reason but still return true.
     */
    suspend fun autoSignIn(): Boolean {
        try {
            val settings = project.settingsService
                ?: return true.also { logger.warn("Auto sign-in failed: settings service not available") }
            if (!appSettings.autoSignIn)
                return true.also { logger.warn("Auto sign-in failed: auto sign-in disabled") }
            val tokenStr = resolveToken(settings)
                ?: return true.also { logger.warn("Auto sign-in failed: unable to retrieve token from password safe") }
            val agent = project.agentService?.agent
                ?: return true.also { logger.warn("Auto sign-in failed: agent service not available") }

            val token = gson.fromJson<JsonObject>(tokenStr)
            val loginResult =
                agent.loginToken(
                    LoginWithTokenParams(
                        token,
                        settings.state.teamId // seems to not be used
                    )
                ).await()

            return if (loginResult.error != null) {
                logger.warn("Auto sign-in error ${loginResult.error}")
                settings.state.teamId = null
                appSettings.state.teamId = null
                saveAccessToken(SaveTokenReason.LOGIN_ERROR, null)
                logger.info("Auto sign-in failed: ${loginResult.error}")
                false
            } else {
                completeLogin(SaveTokenReason.AUTO_SIGN_IN, loginResult)
                logger.info("Auto sign-in successful")
                true
            }
        } catch (err: Exception) {
            logger.warn("Auto sign-in error $err")
            return false
        }
    }

    fun completeLogin(reason: SaveTokenReason, result: LoginResult) {
        if (project.sessionService?.userLoggedIn == null) {
            result.state?.let {
                mergedCapabilities = extensionCapabilities.merge(it.capabilities)
                project.settingsService?.state?.teamId = it.teamId
                appSettings.state.teamId = it.teamId
                saveAccessToken(reason, it.token)
            }
            project.sessionService?.login(result.userLoggedIn, result.eligibleJoinCompanies)
        }
    }

    suspend fun logout(newServerUrl: String? = null) {
        val agent = project.agentService ?: return
        val session = project.sessionService ?: return
        val settings = project.settingsService ?: return

        session.logout()
        agent.restart(newServerUrl)
        saveAccessToken(SaveTokenReason.LOGOUT, null)
        settings.state.teamId = null
        appSettings.state.teamId = null
    }

    private var upgradeRequiredShown = false
    fun onApiVersionChanged(notification: DidChangeApiVersionCompatibilityNotification) {
        apiVersionCompatibility = notification.compatibility
        if (notification.compatibility == ApiVersionCompatibility.API_UPGRADE_RECOMMENDED) {
            missingCapabilities = notification.missingCapabilities
        }

        project.webViewService?.postNotification(DidChangeApiVersionCompatibility())
        if (notification.compatibility != ApiVersionCompatibility.API_COMPATIBLE && !upgradeRequiredShown) {
            upgradeRequiredShown = true
            ApplicationManager.getApplication().invokeLater {
                project.codeStream?.show()
            }
        }
    }

    fun copyInternalAccessToken(fromServerUrl: String?, toServerUrl: String?) {
        project.settingsService?.storedTeamId()?.let {
            copyAccessToken(fromServerUrl, toServerUrl, it, it)
        }
    }

    fun copyAccessToken(fromServerUrl: String?, toServerUrl: String?, fromTeamId: String?, toTeamId: String?) {
        val settings = project.settingsService ?: return
        val tokenStr = PasswordSafe.instance.getPassword(settings.credentialAttributes(true, fromServerUrl, fromTeamId))
            ?: PasswordSafe.instance.getPassword(settings.credentialAttributes(false, fromServerUrl))
            ?: return
        val token = gson.fromJson<JsonObject>(tokenStr)
        token["url"] = toServerUrl
        saveAccessToken(SaveTokenReason.COPY, token, toServerUrl, toTeamId)
    }

    private fun saveAccessToken(reason: SaveTokenReason, accessToken: JsonObject?, serverUrl: String? = null, teamId: String? = null) {
        val settings = project.settingsService ?: return
        if (accessToken != null) {
            logger.info("Saving access token to password safe $reason with provided teamid $teamId")
        } else {
            logger.info("Clearing access token from password safe $reason with provided teamid $teamId")
        }

        val credentials = accessToken?.let {
            Credentials(null, it.toString())
        }

        val credentialAttributes = settings.credentialAttributes(true, serverUrl, teamId)

        PasswordSafe.instance.set(
            credentialAttributes,
            credentials
        )
    }
}
