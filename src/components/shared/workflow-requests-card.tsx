"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAttachmentTypes } from "@/hooks/use-attachments";
import {
    useCreateWorkflowRequest,
    useEntityWorkflowRequests,
    type WorkflowEntityType,
} from "@/hooks/use-workflow-requests";
import { uploadDocuments } from "@/lib/utils/upload-documents";
import { BrushCleaning, Plus, Workflow } from "lucide-react";

export function WorkflowRequestsCard({
    entityType,
    entityId,
    title = "Internal Workflows",
}: {
    entityType: WorkflowEntityType;
    entityId: string | null;
    title?: string;
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [description, setDescription] = useState("");
    const [assignedEmail, setAssignedEmail] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    const { data, isLoading } = useEntityWorkflowRequests(entityType, entityId);
    const { data: attachmentTypesData } = useAttachmentTypes();
    const createWorkflow = useCreateWorkflowRequest(entityType, entityId);

    const artworkAttachmentType = useMemo(
        () => (attachmentTypesData?.data || []).find((type) => type.code === "ARTWORK_REFERENCE"),
        [attachmentTypesData?.data]
    );

    const resetForm = () => {
        setTitleValue("");
        setDescription("");
        setAssignedEmail("");
        setFiles([]);
    };

    const handleCreate = async () => {
        if (!entityId) return;
        if (!titleValue.trim()) return toast.error("Title is required");

        try {
            const attachments =
                files.length > 0 && artworkAttachmentType
                    ? (await uploadDocuments({ files })).map((file) => ({
                          attachment_type_id: artworkAttachmentType.id,
                          file_url: file.fileUrl,
                          file_name: file.fileName,
                          mime_type: file.mimeType,
                          file_size_bytes: file.fileSizeBytes,
                      }))
                    : [];

            await createWorkflow.mutateAsync({
                workflow_kind: "ARTWORK_SUPPORT",
                title: titleValue.trim(),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(assignedEmail.trim() ? { assigned_email: assignedEmail.trim() } : {}),
                ...(attachments.length > 0 ? { attachments } : {}),
            });
            toast.success("Artwork support requested");
            setIsCreateOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to request artwork support");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5" />
                        {title}
                    </CardTitle>
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (!open) resetForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Request Artwork Support
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Request Artwork Support</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={titleValue}
                                        onChange={(event) => setTitleValue(event.target.value)}
                                        placeholder="What support is needed?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description / Notes</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        rows={4}
                                        placeholder="Artwork scope, timing, and constraints"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Assigned Email (Optional)</Label>
                                    <Input
                                        type="email"
                                        value={assignedEmail}
                                        onChange={(event) => setAssignedEmail(event.target.value)}
                                        placeholder="team@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reference Files (Optional)</Label>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={(event) =>
                                            setFiles(Array.from(event.target.files || []))
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={createWorkflow.isPending}>
                                    {createWorkflow.isPending ? "Saving..." : "Submit Request"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && (
                    <>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </>
                )}

                {!isLoading && (data?.data || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No internal workflow requests have been created yet.
                    </p>
                )}

                {(data?.data || []).map((workflow) => (
                    <div
                        key={workflow.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                    <BrushCleaning className="h-3 w-3" />
                                    {workflow.workflow_kind.replace(/_/g, " ")}
                                </p>
                                <p className="font-semibold">{workflow.title}</p>
                                {workflow.description && (
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {workflow.description}
                                    </p>
                                )}
                            </div>
                            <div className="text-right text-xs font-mono text-muted-foreground">
                                <p>{workflow.status.replace(/_/g, " ")}</p>
                                <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                            </div>
                        </div>
                        {workflow.assigned_email && (
                            <p className="text-xs text-muted-foreground">
                                Assigned email: {workflow.assigned_email}
                            </p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
