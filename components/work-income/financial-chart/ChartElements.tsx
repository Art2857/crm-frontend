import React from 'react';

export const CustomAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={6} stroke="#9CA3AF" />
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize={12}
      >
        {new Date(payload.value).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })}
      </text>
    </g>
  );
};

export const CenteredBar = (props: any) => {
  const { x, y, width, height, fill, ...rest } = props;
  return (
    <rect
      x={x - 6.5}
      y={y}
      width={15}
      height={height}
      fill={fill}
      rx={2}
      ry={2}
      {...rest}
    />
  );
};
