// workbench-shell — route-backed calculators and benchtop tools.
import { type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Launcher, TOOLS } from "./launcher";
import { DilutionTool } from "./tools/dilution";
import { MolarityTool } from "./tools/molarity";
import { MediaPrepTool } from "./tools/media-prep";
import { CfuTool } from "./tools/cfu";
import { HaemocytometerTool } from "./tools/haemocytometer";
import { CellCultureTool } from "./tools/cell-culture";
import { TimersTool } from "./tools/timers";
import { PlateMapperTool } from "./tools/plate-mapper";
import { DoublingTimeTool } from "./tools/doubling-time";
import { UnitConverterTool } from "./tools/unit-converter";
import { PercentSolutionTool } from "./tools/percent-solution";
import { EmergencyStrip } from "@/components/emergency/emergency-strip";

export type ToolId =
  | "dilution" | "molarity" | "media-prep" | "cfu" | "haemocytometer" | "cell-culture"
  | "timers" | "plate-mapper" | "doubling-time" | "unit-converter" | "percent-solution";

const TOOL_VIEWS: Record<ToolId, ComponentType> = {
  dilution: DilutionTool,
  molarity: MolarityTool,
  "media-prep": MediaPrepTool,
  cfu: CfuTool,
  haemocytometer: HaemocytometerTool,
  "cell-culture": CellCultureTool,
  timers: TimersTool,
  "plate-mapper": PlateMapperTool,
  "doubling-time": DoublingTimeTool,
  "unit-converter": UnitConverterTool,
  "percent-solution": PercentSolutionTool,
};

export function isToolId(value: string | undefined): value is ToolId {
  return Boolean(value && value in TOOL_VIEWS);
}

export function WorkbenchShell() {
  const { tool: requestedTool } = useParams<{ tool?: string }>();
  const navigate = useNavigate();
  const tool = isToolId(requestedTool) ? requestedTool : null;
  const View = tool ? TOOL_VIEWS[tool] : null;
  const meta = tool ? TOOLS.find((item) => item.id === tool) : null;

  const pick = (id: ToolId) => navigate(`/workbench/${id}`);

  return (
    <div className="space-y-5">
      {tool && (
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate("/workbench")}>
            <ArrowLeft size={14} /> Back to the bench
          </Button>
          <p className="mt-2 text-[11px] text-slate-400">{meta?.blurb}</p>
        </div>
      )}
      {View ? <View /> : <Launcher onPick={pick} />}
      {tool === "media-prep" && <EmergencyStrip kind="gas" />}
    </div>
  );
}
