import { useState } from "react";
import { Github, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const GITHUB_REPO = "https://github.com/DNRoman123/hey-neighbor-io";
const CODEMAGIC_URL = "https://codemagic.io/apps";
const LOVABLE_URL = "https://app.lovable.dev";

const syncSteps = [
  "Open the Lovable editor for this project.",
  "Click the Plus (+) menu in the chat input (bottom-left).",
  "Choose GitHub → Manage project.",
  "Lovable will push the latest code to the connected repo automatically.",
  "Then go to Codemagic and trigger the 'ios-appstore' build workflow.",
];

export function GitHubSyncButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copySteps() {
    const text = [
      "Hey Neighbor — GitHub sync steps",
      "",
      ...syncSteps.map((s, i) => `${i + 1}. ${s}`),
      "",
      `GitHub repo: ${GITHUB_REPO}`,
      `Codemagic: ${CODEMAGIC_URL}`,
      `Lovable: ${LOVABLE_URL}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("Sync steps copied to clipboard."));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Could not copy steps."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl border-border text-[14px] font-bold"
        >
          <Github className="mr-2 size-4" />
          {t("GitHub Sync")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-5 text-primary" />
            {t("Sync to GitHub")}
          </DialogTitle>
          <DialogDescription className="text-left text-[13px]">
            {t(
              "The app can't force a Lovable push directly — it has to be triggered from the Lovable editor. Follow these steps to push the latest code to GitHub before building in Codemagic.",
            )}
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 space-y-2 rounded-2xl bg-secondary p-4 text-[13px] leading-relaxed">
          {syncSteps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-foreground">{t(step)}</span>
            </li>
          ))}
        </ol>

        <div className="mt-2 grid gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-full justify-between rounded-xl text-[13px] font-bold"
            asChild
          >
            <a href={LOVABLE_URL} target="_blank" rel="noopener noreferrer">
              <span className="flex items-center gap-2">
                <RefreshCw className="size-4" />
                {t("Open Lovable")}
              </span>
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-full justify-between rounded-xl text-[13px] font-bold"
            asChild
          >
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
              <span className="flex items-center gap-2">
                <Github className="size-4" />
                {t("Open GitHub repo")}
              </span>
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-full justify-between rounded-xl text-[13px] font-bold"
            asChild
          >
            <a href={CODEMAGIC_URL} target="_blank" rel="noopener noreferrer">
              <span className="flex items-center gap-2">
                <ExternalLink className="size-4" />
                {t("Open Codemagic")}
              </span>
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={copySteps}
            className="h-11 w-full rounded-xl text-[13px] font-bold"
          >
            {copied ? (
              <Check className="mr-2 size-4 text-primary" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            {copied ? t("Copied") : t("Copy steps")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
