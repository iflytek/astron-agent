import { ConnectionLineComponentProps } from 'reactflow';
import React from 'react';

const ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle = { strokeWidth: 2, stroke: '#6356EA' }, // provide a default value for connectionLineStyle
}: ConnectionLineComponentProps): React.ReactElement => {
  return (
    <g>
      <path
        fill="none"
        // ! Replace hash # colors here
        className="animated stroke-connection "
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
        style={connectionLineStyle}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke="#222"
        className=""
        strokeWidth={1.5}
      />
    </g>
  );
};

export default ConnectionLineComponent;
