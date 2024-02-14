import { NRQLResult } from "@codestream/protocols/agent";
import React, { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Colors, ColorsHash } from "./utils";
import { CustomTooltip } from "./CustomTooltip";

export const NRQLResultsPie = (props: { results: NRQLResult[] }) => {
	const [showLegend, setShowLegend] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			setShowLegend(window.innerWidth > 768);
		};

		window.addEventListener("resize", handleResize);
		handleResize(); // Initial call

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const result = props.results ? props.results[0] : undefined;
	const dataKeys = Object.keys(result || {}).filter(
		_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
	);
	return (
		<div className="histogram-chart">
			<div style={{ marginLeft: "0px", marginBottom: "20px" }}>
				<ResponsiveContainer width="100%" height={400} debounce={1}>
					<PieChart width={500} height={400}>
						<Pie
							data={props.results}
							dataKey="count" // Specify the data key to determine pie slices
							cx="50%" // Set the x-coordinate of the center of the pie
							cy="50%" // Set the y-coordinate of the center of the pie
							outerRadius={80} // Specify the outer radius of the pie
							fill="#8884d8" // Specify the fill/color of the pie slices
							label // Enable labels on the pie slices
						>
							{/* Render labels */}
							{dataKeys.map((_, index) => {
								const color = ColorsHash[index % Colors.length];
								return <Cell key={index} fill={color} />;
							})}
						</Pie>
						<Tooltip content={<CustomTooltip />} />
						{showLegend && (
							<Legend
								fontSize={10}
								align="right"
								verticalAlign="middle"
								layout="vertical"
								wrapperStyle={{
									padding: "0 2rem",
									height: "80%",
									overflow: "auto",
								}}
							/>
						)}
					</PieChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};
