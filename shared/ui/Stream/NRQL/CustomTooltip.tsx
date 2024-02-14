import React from "react";
import styled from "styled-components";

type CustomTooltipProps = {
	active?: boolean;
	payload?: Array<any>;
	label?: any;
};

const StyledCustomTooltipWrapper = styled.div`
	.tooltip--custom {
		background: var(--base-background-color);
		border: 1px solid var(--base-border-color);
		color: var(--text-color);
		padding: 5px;
		font-size: 10px;
	}
`;

const _customTooltip = ({ active, payload, label }: CustomTooltipProps) => {
	if (active && payload && payload.length) {
		return (
			<StyledCustomTooltipWrapper>
				<div className="tooltip--custom">
					<p>{payload[0].payload.facet}</p>
					<p>Value: {payload[0].value}</p>
				</div>
			</StyledCustomTooltipWrapper>
		);
	}

	return null;
};

export const CustomTooltip = styled(_customTooltip)``;
