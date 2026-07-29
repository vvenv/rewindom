import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Plus, StickyNote } from "lucide-react";

import { NoteCreateSheet } from "../components/NoteCreateSheet.js";
import { NoteFilters } from "../components/NoteFilters.js";
import { NotesGrid } from "../components/NotesGrid.js";
import { useNotes } from "../hooks/useNotes.js";
import { useNotesPage } from "../hooks/useNotesPage.js";

export function Notes() {
  const {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sortValue,
    handleSortChange,
    handleFiltersChange,
  } = useNotesPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("notes.write");
  const { data, isLoading, isError, error, refetch } = useNotes(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={StickyNote}
      title="笔记"
      description="模块化架构金标准示例：租户内笔记管理"
      action={
        canWrite ? (
          <NoteCreateSheet>
            <DraggableFabTrigger storageKey="notes_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">新建笔记</span>
            </DraggableFabTrigger>
          </NoteCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <NoteFilters
          q={q}
          sortValue={sortValue}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
        />
        <NotesGrid
          notes={data?.items ?? []}
          isLoading={isLoading && !data}
          isError={isError && !data}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          q={q}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
