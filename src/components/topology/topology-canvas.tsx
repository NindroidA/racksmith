"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection as RFConnection,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import toast from "react-hot-toast";
import {
  SquaresFour,
  Plus,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { toPng } from "html-to-image";
import { DeviceNode, type DeviceNodeData } from "./device-node";
import { CableEdge, CABLE_COLORS, type CableEdgeData } from "./cable-edge";
import { ConnectionForm } from "./connection-form";
import { Button } from "@/components/ui/button";
import {
  updateDevicePosition,
  autoLayout,
} from "@/app/(dashboard)/topology/actions";
import { useRouter } from "next/navigation";
import { describeError } from "@/lib/error-message";

export type TopologyDevice = {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  ipAddress: string | null;
  rackName: string | null;
  canvasX: number | null;
  canvasY: number | null;
};

export type TopologyConnection = {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourcePort: string;
  targetPort: string;
  cableType: string;
  bandwidth: string | null;
  vlan: string | null;
  description: string;
};

type Props = {
  devices: TopologyDevice[];
  connections: TopologyConnection[];
};

const NODE_TYPES = { device: DeviceNode };
const EDGE_TYPES = { cable: CableEdge };

function CanvasInner({ devices, connections }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<TopologyConnection | null>(
    null,
  );
  const [prefilled, setPrefilled] = useState<
    { sourceDeviceId: string; targetDeviceId: string } | undefined
  >();
  const canvasRef = useRef<HTMLDivElement>(null);

  const initialNodes: Node<DeviceNodeData>[] = useMemo(
    () =>
      devices.map((d, i) => {
        // If no canvas position stored, lay out in a default grid
        const cols = Math.max(1, Math.ceil(Math.sqrt(devices.length)));
        const gridX = (i % cols) * 320;
        const gridY = Math.floor(i / cols) * 200;
        return {
          id: d.id,
          type: "device",
          position: {
            x: d.canvasX ?? gridX,
            y: d.canvasY ?? gridY,
          },
          data: {
            deviceId: d.id,
            name: d.name,
            deviceType: d.deviceType,
            manufacturer: d.manufacturer,
            model: d.model,
            sizeU: d.sizeU,
            portCount: d.portCount,
            ipAddress: d.ipAddress,
            rackName: d.rackName,
          },
        };
      }),
    [devices],
  );

  const initialEdges: Edge<CableEdgeData>[] = useMemo(
    () =>
      connections.map((c) => ({
        id: c.id,
        source: c.sourceDeviceId,
        target: c.targetDeviceId,
        sourceHandle: "right",
        targetHandle: "left-in",
        type: "cable",
        data: {
          cableType: c.cableType,
          bandwidth: c.bandwidth,
          vlan: c.vlan,
          sourcePort: c.sourcePort,
          targetPort: c.targetPort,
        },
      })),
    [connections],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Debounced position save when a node finishes dragging
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<DeviceNodeData>>[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          const { id, position } = change;
          startTransition(async () => {
            await updateDevicePosition({
              deviceId: id,
              x: position.x,
              y: position.y,
            });
          });
        }
      }
    },
    [onNodesChange],
  );

  // Create connection when user drags between handles
  const onConnect = useCallback((conn: RFConnection) => {
    if (!conn.source || !conn.target) return;
    if (conn.source === conn.target) {
      toast.error("Can't connect device to itself");
      return;
    }
    setPrefilled({
      sourceDeviceId: conn.source,
      targetDeviceId: conn.target,
    });
    setEditingConn(null);
    setModalOpen(true);
  }, []);

  // Click an edge to edit
  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      const conn = connections.find((c) => c.id === edge.id);
      if (!conn) return;
      setEditingConn(conn);
      setPrefilled(undefined);
      setModalOpen(true);
    },
    [connections],
  );

  // Auto-layout button
  function handleAutoLayout() {
    startTransition(async () => {
      const result = await autoLayout();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Layout reset");
      router.refresh();
    });
  }

  // Export to PNG
  async function handleExport() {
    if (!canvasRef.current) return;
    try {
      const el = canvasRef.current.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement | null;
      const container = canvasRef.current.querySelector(
        ".react-flow",
      ) as HTMLElement | null;
      if (!container) return;

      toast.loading("Generating image...", { id: "export" });

      const dataUrl = await toPng(container, {
        backgroundColor: "#0e0b1c",
        pixelRatio: 2,
        filter: (node) => {
          // Skip controls + minimap + attribution in export
          if (!(node instanceof HTMLElement)) return true;
          return (
            !node.classList?.contains("react-flow__controls") &&
            !node.classList?.contains("react-flow__minimap") &&
            !node.classList?.contains("react-flow__attribution")
          );
        },
      });

      const link = document.createElement("a");
      link.download = `racksmith-topology-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Downloaded", { id: "export" });
    } catch (err) {
      toast.error(describeError(err, "Export failed"), {
        id: "export",
      });
    }
  }

  function handleAddConnection() {
    setEditingConn(null);
    setPrefilled(undefined);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingConn(null);
    setPrefilled(undefined);
  }

  function handleModalSaved() {
    router.refresh();
  }

  const deviceOptions = devices.map((d) => ({ id: d.id, name: d.name }));
  const selectedCount = nodes.filter((n) => n.selected).length;

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleAddConnection}
            iconLeft={
              <Plus className="h-3.5 w-3.5" weight="bold" aria-hidden />
            }
          >
            Add Connection
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoLayout}
            disabled={pending}
            iconLeft={
              <SquaresFour className="h-3.5 w-3.5" weight="bold" aria-hidden />
            }
          >
            Auto-Layout
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            iconLeft={
              <DownloadSimple
                className="h-3.5 w-3.5"
                weight="bold"
                aria-hidden
              />
            }
          >
            Export PNG
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded"
              style={{ background: CABLE_COLORS.ethernet }}
            />
            Ethernet
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded"
              style={{ background: CABLE_COLORS.fiber }}
            />
            Fiber
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded"
              style={{ background: CABLE_COLORS.dac }}
            />
            DAC
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded"
              style={{ background: CABLE_COLORS.power }}
            />
            Power
          </div>
        </div>
      </div>

      {/* Selection announce — sr-only live region so screen reader users
          hear how many nodes are currently selected on the canvas. */}
      <p aria-live="polite" className="sr-only">
        {selectedCount > 0
          ? `${selectedCount} device${selectedCount === 1 ? "" : "s"} selected`
          : "No devices selected"}
      </p>

      <div
        ref={canvasRef}
        className="h-[calc(100vh-16rem)] overflow-hidden rounded-2xl border-2 border-white/10 bg-[#0e0b1c]"
      >
        <ReactFlow
          aria-label="Network topology canvas"
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultEdgeOptions={{ type: "cable" }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.08)"
          />
          <Controls
            style={{
              background: "rgba(20,25,40,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          />
          <MiniMap
            style={{
              background: "rgba(10,14,26,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
            maskColor="rgba(10,14,26,0.6)"
            nodeColor="#5765f4"
          />
        </ReactFlow>
      </div>

      <ConnectionForm
        open={modalOpen}
        onClose={handleModalClose}
        devices={deviceOptions}
        existing={editingConn ?? undefined}
        prefilled={prefilled}
        onSaved={handleModalSaved}
      />
    </>
  );
}

export function TopologyCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
