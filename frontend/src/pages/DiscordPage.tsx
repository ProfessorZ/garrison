import DiscordSettings from "../components/DiscordSettings";
import DiscordBotStatus from "../components/DiscordBotStatus";

export default function DiscordPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-[#e2e8f0]">Discord Integration</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DiscordSettings />
        </div>
        <div>
          <DiscordBotStatus />
        </div>
      </div>
    </div>
  );
}
