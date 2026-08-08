import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — ClassDesk" },
      { name: "description", content: "Update your name, year level and class section." },
      { property: "og:title", content: "My profile — ClassDesk" },
      { property: "og:description", content: "Your ClassDesk account details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const sections = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName ?? me.profile?.full_name ?? "",
          year_level: yearLevel ?? me.profile?.year_level ?? "",
          section_id: sectionId ?? me.profile?.section_id ?? null,
        })
        .eq("id", me.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <AppShell title="My profile" subtitle={me?.email}>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Account details
            {me?.roles.map((r) => (
              <Badge key={r} variant="secondary" className="capitalize">
                {r}
              </Badge>
            ))}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName ?? me?.profile?.full_name ?? ""}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year level</Label>
            <Input
              id="year"
              placeholder="e.g. Grade 10"
              value={yearLevel ?? me?.profile?.year_level ?? ""}
              onChange={(e) => setYearLevel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={sectionId ?? me?.profile?.section_id ?? ""}
              onValueChange={setSectionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not assigned" />
              </SelectTrigger>
              <SelectContent>
                {(sections.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
