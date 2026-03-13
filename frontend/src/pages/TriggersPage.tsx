import { Zap } from "lucide-react";
import TriggerManager from "../components/TriggerManager";

export default function TriggersPage() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,212,170,0.08)" }}>
          <Zap className="h-5 w-5 text-[#00d4aa]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Triggers</h2>
          <p className="text-xs text-[#64748b]">Automated actions on server events</p>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <TriggerManager />
      </div>
    </div>
  );
}
