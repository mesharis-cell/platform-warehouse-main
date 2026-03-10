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
    useAvailableWorkflowDefinitions,
    useCreateWorkflowRequest,
    useEntityWorkflowRequests,
    type WorkflowEntityType,
} from "@/hooks/use-workflow-requests";
import { uploadDocuments } from "@/lib/utils/upload-documents";
import { Plus, Workflow } from "lucide-react";

export function WorkflowRequestsCard({
    entityType,
    entityId,
    title = "Workflows",
}: {
    entityType: WorkflowEntityType;
    entityId: string | null;
    title?: string;
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorkflowCode, setSelectedWorkflowCode] = useState("");
    const [titleValue, setTitleValue] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    const { data, isLoading } = useEntityWorkflowRequests(entityType, entityId);
    const { data: definitionsData } = useAvailableWorkflowDefinitions(entityType, entityId);
    const { data: attachmentTypesData } = useAttachmentTypes("WORKFLOW_REQUEST");
    const createWorkflow = useCreateWorkflowRequest(entityType, entityId);

    const definitions = definitionsData?.data || [];
    const selectedDefinition = definitions.find(
        (definition) => definition.code === selectedWorkflowCode
    );
    const referenceAttachmentType = useMemo(
        () =>
            (attachmentTypesData?.data || []).find((type) =>
                ["WORKFLOW_REFERENCE", "ARTWORK_REFERENCE"].includes(type.code)
            ) || null,
        [attachmentTypesData?.data]
    );

    const resetForm = () => {
        setSelectedWorkflowCode(definitions[0]?.code || "");
        setTitleValue("");
        setDescription("");
        setFiles([]);
    };

    const handleCreate = async () => {
        if (!entityId) return;
        if (!selectedWorkflowCode) return toast.error("Select a workflow");
        if (!titleValue.trim()) return toast.error("Title is required");

        try {
            const attachments =
                files.length > 0 && referenceAttachmentType
                    ? (await uploadDocuments({ files })).map((file) => ({
                          attachment_type_id: referenceAttachmentType.id,
                          file_url: file.fileUrl,
                          file_name: file.fileName,
                          mime_type: file.mimeType,
                          file_size_bytes: file.fileSizeBytes,
                      }))
                    : [];

            await createWorkflow.mutateAsync({
                workflow_code: selectedWorkflowCode,
                title: titleValue.trim(),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(attachments.length > 0 ? { attachments } : {}),
            });
            toast.success("Workflow requested");
            setIsCreateOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to create workflow request");
        }
    };

    const groupedWorkflows = useMemo(() => {
        const rows = data?.data || [];
        return definitions.map((definition) => ({
            definition,
            requests: rows.filter((row) => row.workflow_code === definition.code),
        }));
    }, [data?.data, definitions]);

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
                            if (open) {
                                setSelectedWorkflowCode(definitions[0]?.code || "");
                            } else {
                                resetForm();
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={definitions.length === 0}>
                                <Plus className="h-4 w-4 mr-1" />
                                Request Workflow
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Request Internal Workflow</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Workflow</Label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        value={selectedWorkflowCode}
                                        onChange={(event) =>
                                            setSelectedWorkflowCode(event.target.value)
                                        }
                                    >
                                        {definitions.map((definition) => (
                                            <option key={definition.id} value={definition.code}>
                                                {definition.label}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedDefinition?.description ? (
                                        <p className="text-xs text-muted-foreground">
                                            {selectedDefinition.description}
                                        </p>
                                    ) : null}
                                    {selectedDefinition?.workflow_family ? (
                                        <p className="text-xs text-muted-foreground">
                                            {selectedDefinition.workflow_family} ·{" "}
                                            {selectedDefinition.status_model_key}
                                        </p>
                                    ) : null}
                                </div>
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
                                        placeholder="Scope, timing, constraints, and context"
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
            <CardContent className="space-y-4">
                {isLoading && (
                    <>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </>
                )}

                {!isLoading && groupedWorkflows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No internal workflow types are enabled for this record.
                    </p>
                )}

                {groupedWorkflows.map(({ definition, requests }) => (
                    <div
                        key={definition.id}
                        className="space-y-3 rounded-lg border border-border/60 p-4"
                    >
                        <div>
                            <p className="text-sm font-semibold">{definition.label}</p>
                            {definition.description ? (
                                <p className="text-xs text-muted-foreground">
                                    {definition.description}
                                </p>
                            ) : null}
                        </div>
                        {requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No requests created for this workflow yet.
                            </p>
                        ) : (
                            requests.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{workflow.title}</p>
                                            {workflow.description ? (
                                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                    {workflow.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="text-right text-xs font-mono text-muted-foreground">
                                            <p>{workflow.status.replace(/_/g, " ")}</p>
                                            <p>{workflow.workflow_label}</p>
                                            <p>
                                                {new Date(workflow.requested_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
