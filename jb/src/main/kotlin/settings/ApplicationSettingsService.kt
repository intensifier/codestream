package com.codestream.settings

import com.codestream.DEBUG
import com.codestream.protocols.agent.Extension
import com.codestream.protocols.agent.ProxySettings
import com.codestream.protocols.agent.TraceLevel
import com.codestream.protocols.webview.Configs
import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.util.io.encodeUrlQueryParameter
import com.intellij.util.net.HttpConfigurable

const val API_PD = "https://codestream-api-v2-pd.staging-service.nr-ops.net"
const val API_QA = "https://codestream-api-v2-qa.staging-service.nr-ops.net"
const val API_PROD = "https://codestream-api-v2-us1.service.newrelic.com"
const val DEFAULT_GOLDEN_SIGNALS_FORMAT =
    "avg duration: \${averageDuration} | error rate: \${errorRate} - \${sampleSize} samples in the last \${since}"

enum class ProxySupport(val value: String, val label: String) {
    ON("on", "On"),
    OFF("off", "Off");

    override fun toString() = label
}

interface GoldenSignalListener {
    fun setEnabled(value: Boolean)
    fun setMLTFormat(value: String)
}

interface ConfigChangeListener {
    fun onCriticalConfigurationChange(resetContext: Boolean);
}

data class ApplicationSettingsServiceState(
    var autoSignIn: Boolean = true,
    var email: String? = null,
    var serverUrl: String = API_PROD,
    var disableStrictSSL: Boolean = false,
    var extraCerts: String? = null,
    var proxySupport: ProxySupport = ProxySupport.ON,
    var proxyStrictSSL: Boolean = true,
    var firstRun: Boolean = true,
    var jcef: Boolean = true,
    var showGoldenSignalsInEditor: Boolean = true,
    var goldenSignalsInEditorFormat: String = DEFAULT_GOLDEN_SIGNALS_FORMAT,
    var teamId: String? = null
)

@State(name = "CodeStream", storages = [Storage("codestream.xml")])
class ApplicationSettingsService : PersistentStateComponent<ApplicationSettingsServiceState> {
    private var _state = ApplicationSettingsServiceState()
    private val logger = Logger.getInstance(ApplicationSettingsService::class.java)
    private val goldenSignalListeners = mutableSetOf<GoldenSignalListener>()
    private val configChangeListeners = mutableSetOf<ConfigChangeListener>()

    override fun getState(): ApplicationSettingsServiceState = _state

    override fun loadState(state: ApplicationSettingsServiceState) {
        state.serverUrl = if (state.serverUrl.isNullOrEmpty()) state.serverUrl else state.serverUrl.trimEnd('/')
        if (state.goldenSignalsInEditorFormat.contains("{throughput}") || state.goldenSignalsInEditorFormat.contains("{errorsPerMinute}")) {
            state.goldenSignalsInEditorFormat = DEFAULT_GOLDEN_SIGNALS_FORMAT
        }
        _state = state
    }

    fun addGoldenSignalsListener(listener: GoldenSignalListener) {
        goldenSignalListeners.add(listener)
    }

    fun removeGoldenSignalsListener(listener: GoldenSignalListener) {
        goldenSignalListeners.remove(listener)
    }

    fun addConfigChangeListener(listener: ConfigChangeListener) {
        configChangeListeners.add(listener)
    }

    fun removeConfigChangeListener(listener: ConfigChangeListener) {
        configChangeListeners.remove(listener)
    }

    val environmentVersion: String
        get() = PluginManager.getPlugin(
            PluginId.findId("com.codestream.jetbrains-codestream")
        )!!.version

    val extensionInfo get() = Extension(environmentVersion)

    val traceLevel get() = if (logger.isDebugEnabled) TraceLevel.DEBUG else TraceLevel.VERBOSE

    val isDebugging get() = DEBUG

    var serverUrl
        get() = state.serverUrl
        set(value) {
            state.serverUrl = value
        }

    var disableStrictSSL
        get() = state.disableStrictSSL
        set(value) {
            state.disableStrictSSL = value
        }

    var extraCerts
        get() = state.extraCerts
        set(value) {
            state.extraCerts = value
        }

    val email get() = state.email

    var autoSignIn
        get() = state.autoSignIn
        set(value) {
            state.autoSignIn = value
        }

    var jcef
        get() = state.jcef
        set(value) {
            state.jcef = value
        }

    var showGoldenSignalsInEditor
        get() = state.showGoldenSignalsInEditor
        set(value) {
            val changed = state.showGoldenSignalsInEditor != value
            state.showGoldenSignalsInEditor = value
            if (changed) {
                fireGoldenSignalEnabledChange(value)
            }
        }
    var goldenSignalsInEditorFormat
        get() = state.goldenSignalsInEditorFormat
        set(value) {
            val changed = state.goldenSignalsInEditorFormat != value
            state.goldenSignalsInEditorFormat = value
            if (changed) {
                fireGoldenSignalFormatChange(value)
            }
        }

    private fun fireGoldenSignalFormatChange(value: String) {
        for (listener in goldenSignalListeners) {
            listener.setMLTFormat(value)
        }
    }

    private fun fireGoldenSignalEnabledChange(value: Boolean) {
        for (listener in goldenSignalListeners) {
            listener.setEnabled(value)
        }
    }

    fun fireCriticalConfigChange(resetContext: Boolean) {
        for (listener in configChangeListeners) {
            listener.onCriticalConfigurationChange(resetContext)
        }
    }

    var firstRun
        get() = state.firstRun
        set(value) {
            state.firstRun = value
        }

    val proxySettings
        get(): ProxySettings? {
            val httpConfig = HttpConfigurable.getInstance()
            return if (httpConfig.USE_HTTP_PROXY && !httpConfig.PROXY_HOST.isNullOrBlank()) {
                val url = StringBuilder("http://")

                if (httpConfig.PROXY_AUTHENTICATION) {
                    val login = httpConfig.proxyLogin?.encodeUrlQueryParameter()
                    val password = httpConfig.plainProxyPassword?.encodeUrlQueryParameter()
                    url.append("${login}:${password}@")
                }

                url.append(httpConfig.PROXY_HOST)

                if (httpConfig.PROXY_PORT != null) {
                    url.append(":${httpConfig.PROXY_PORT}")
                }

                return ProxySettings(url.toString(), state.proxyStrictSSL)
            } else {
                null
            }
        }

    val proxySupport: String
        get() =
            if (state.proxySupport == ProxySupport.ON && proxySettings != null)
                "override"
            else
                state.proxySupport.value

    // proxySupport get() property is returns a string for "override" case - different function here for ProxySupport type
    fun setProxySupport(value: ProxySupport) {
        state.proxySupport = value
    }

    var proxyStrictSSL
        get() = state.proxyStrictSSL
        set(value) {
            state.proxyStrictSSL = value
        }

    val webViewConfigs
        get() = Configs(
            "unknown",
            state.serverUrl,
            state.email,
            isDebugging,
            state.showGoldenSignalsInEditor
        )
}
