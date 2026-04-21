type Props = {
  x: number;
  y: number;
  width: number;
  /** First port number in the group (1, 7, 13, etc.) */
  startPort: number;
  /** Last port number in group */
  endPort: number;
};

/**
 * Tiny port-group numbering like "1—6" printed above port groups.
 * Adds authentic "real switch" feel — every enterprise switch has these.
 */
export function PortNumbering({ x, y, width, startPort, endPort }: Props) {
  return (
    <text
      x={x + width / 2}
      y={y}
      fontSize={2.1}
      fontFamily="ui-monospace, monospace"
      fill="#fff"
      opacity={0.28}
      textAnchor="middle"
      dominantBaseline="middle"
      letterSpacing="0.02em"
    >
      {startPort}–{endPort}
    </text>
  );
}
