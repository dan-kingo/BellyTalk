import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { presenceService } from "../../services/presence.service";

const HEARTBEAT_MS = 30000;

const PresenceHeartbeat: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Keep presence up-to-date on any authenticated page, not just chat.
    presenceService.initializePresence(user.id);

    const interval = window.setInterval(() => {
      presenceService.updatePresence("online");
    }, HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        presenceService.setAway();
      } else {
        presenceService.updatePresence("online");
      }
    };

    const handleBeforeUnload = () => {
      presenceService.setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      presenceService.setOffline();
    };
  }, [user?.id]);

  return null;
};

export default PresenceHeartbeat;
