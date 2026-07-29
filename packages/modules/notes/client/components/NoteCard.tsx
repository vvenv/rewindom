import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { cn } from "@be-water/ui/utils";
import { Clock, Trash2 } from "lucide-react";

import { NoteEditSheet } from "./NoteEditSheet.js";

import type { NoteListItem } from "../../shared/index.js";

interface NoteCardProps {
  note: NoteListItem;
  canWrite: boolean;
  isDeleting: boolean;
  onDelete: (note: NoteListItem) => void;
}

export function NoteCard({
  note,
  canWrite,
  isDeleting,
  onDelete,
}: NoteCardProps) {
  return (
    <Card
      aria-busy={isDeleting}
      className={cn(
        "h-full transition-opacity",
        isDeleting && "pointer-events-none opacity-60",
      )}
    >
      <CardHeader>
        <CardTitle className="line-clamp-2 wrap-break-word">
          {note.title}
        </CardTitle>
        {canWrite ? (
          <CardAction className="flex items-center gap-1">
            <NoteEditSheet note={note} />
            <Button
              size="icon"
              variant="ghost"
              aria-label="删除笔记"
              disabled={isDeleting}
              onClick={() => onDelete(note)}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-4 wrap-break-word text-muted-foreground">
          {note.content_preview || "（空白笔记）"}
        </p>
      </CardContent>
      <CardFooter className="gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        更新于 {formatBusinessDateOrTimeAgo(note.updated_at)}
      </CardFooter>
    </Card>
  );
}
