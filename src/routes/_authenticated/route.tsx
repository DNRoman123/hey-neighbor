import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useAuth";
import { useRequestNotifications } from "@/hooks/useRequestNotifications";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Trust the stored session first so a returning user stays signed in even
    // if the network is slow or offline. Only verify remotely when none exists.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) return { user: sessionData.session.user };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const userId = useUserId();
  useRequestNotifications(userId);
  return <Outlet />;
}
