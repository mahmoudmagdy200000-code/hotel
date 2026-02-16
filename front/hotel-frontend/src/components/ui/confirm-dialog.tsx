import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void;
    variant?: "default" | "destructive";
    children?: React.ReactNode;
}

export const ConfirmDialog = ({
    isOpen,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    variant = "default",
    children,
}: ConfirmDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children && <div className="py-4">{children}</div>}
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
