"use client";

import { useRef, useState } from "react";
import { Plus, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";

// Compress to max 1920px longest edge at 85% JPEG quality.
// Camera photos on mobile can be 5-10MB — this brings them to ~200-400KB
// so they upload reliably even on slow mobile connections.
const compressImage = (file: File, maxDimension = 1920, quality = 0.85): Promise<File> =>
    new Promise((resolve) => {
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return resolve(file);
                    const name = file.name.replace(/\.[^.]+$/, ".jpg") || "photo.jpg";
                    resolve(new File([blob], name, { type: "image/jpeg" }));
                },
                "image/jpeg",
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            resolve(file); // fall back to original on error
        };
        img.src = blobUrl;
    });

export interface PhotoEntry {
    previewUrl: string;
    note: string;
    file?: File;
    /** S3 URL — set when uploadOnCapture=true and photo has been uploaded */
    uploadedUrl?: string;
}

interface Props {
    photos: PhotoEntry[];
    onChange: (photos: PhotoEntry[]) => void;
    minPhotos?: number;
    label?: string;
    /** When true, uploads each photo to S3 draft folder immediately on confirm */
    uploadOnCapture?: boolean;
    companyId?: string;
    disabled?: boolean;
}

export function PhotoCaptureStrip({
    photos,
    onChange,
    minPhotos,
    label,
    uploadOnCapture,
    companyId,
    disabled,
}: Props) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string>("");
    const [pendingNote, setPendingNote] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleFileSelected = (file: File) => {
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreview(url);
        setPendingNote("");
    };

    const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelected(file);
        e.target.value = "";
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelected(file);
        e.target.value = "";
    };

    const cancelPending = () => {
        URL.revokeObjectURL(pendingPreview);
        setPendingFile(null);
        setPendingPreview("");
        setPendingNote("");
    };

    const confirmPhoto = async () => {
        if (!pendingFile) return;

        let uploadedUrl: string | undefined;
        if (uploadOnCapture) {
            setUploading(true);
            try {
                const compressed = await compressImage(pendingFile);
                const fd = new FormData();
                if (companyId) fd.append("companyId", companyId);
                fd.append("files", compressed);
                // Do NOT set Content-Type — let the browser set multipart/form-data with boundary
                const res = await apiClient.post("/operations/v1/upload/images?draft=true", fd, {
                    headers: { "Content-Type": undefined },
                });
                uploadedUrl = res.data?.data?.imageUrls?.[0];
                if (!uploadedUrl) throw new Error("No URL returned from upload");
            } catch (err) {
                console.error("[photo-upload]", err);
                toast.error("Failed to upload photo. Try again.");
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        // When we have an S3 URL, revoke the blob and use the S3 URL as the preview
        // so removeAt's revokeObjectURL is a safe no-op on HTTPS URLs
        if (uploadedUrl) URL.revokeObjectURL(pendingPreview);

        const entry: PhotoEntry = {
            previewUrl: uploadedUrl ?? pendingPreview,
            note: pendingNote.trim(),
            file: uploadOnCapture ? undefined : pendingFile,
            uploadedUrl,
        };

        // Newest photo prepended (leftmost)
        onChange([entry, ...photos]);
        setPendingFile(null);
        setPendingPreview("");
        setPendingNote("");
    };

    const removeAt = (index: number) => {
        const next = [...photos];
        URL.revokeObjectURL(next[index].previewUrl);
        next.splice(index, 1);
        onChange(next);
    };

    const SQUARE = "w-20 h-20 shrink-0";

    return (
        <div className="space-y-2">
            {label && (
                <p className="text-xs font-mono font-bold uppercase text-foreground">
                    {label}
                    {minPhotos ? ` (min ${minPhotos})` : ""}
                </p>
            )}

            {/* Horizontal strip */}
            <div className="flex gap-3 overflow-x-auto pb-1">
                {/* Photos — newest first */}
                {photos.map((photo, i) => (
                    <div
                        key={i}
                        className={`${SQUARE} relative rounded-lg overflow-hidden border border-border shrink-0`}
                    >
                        <img
                            src={photo.uploadedUrl || photo.previewUrl}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {photo.note && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                                <p className="text-[9px] text-white truncate">{photo.note}</p>
                            </div>
                        )}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeAt(i)}
                                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        )}
                    </div>
                ))}

                {/* Plus button — always rightmost */}
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className={`${SQUARE} rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0`}
                    >
                        <Plus className="w-6 h-6" />
                        <span className="text-[9px] font-mono uppercase">Photo</span>
                    </button>
                )}
            </div>

            {/* Gallery fallback */}
            {!disabled && (
                <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ImageIcon className="w-3 h-3" />
                    Pick from gallery
                </button>
            )}

            {/* Hidden inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraChange}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryChange}
            />

            {/* Note modal — shown after photo is selected */}
            {pendingPreview && (
                <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                        <img
                            src={pendingPreview}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div className="bg-background p-4 space-y-3 border-t border-border">
                        <textarea
                            value={pendingNote}
                            onChange={(e) => setPendingNote(e.target.value)}
                            placeholder="Add a note for this photo (optional)"
                            rows={2}
                            className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={cancelPending}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium disabled:opacity-50"
                            >
                                Retake
                            </button>
                            <button
                                type="button"
                                onClick={confirmPhoto}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                            >
                                {uploading ? "Uploading…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
