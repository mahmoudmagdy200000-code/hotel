import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function PwaPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the native install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-card border shadow-lg rounded-lg p-4 z-[100] flex items-center justify-between">
            <div className="flex flex-col">
                <span className="font-semibold text-sm">Install App</span>
                <span className="text-xs text-muted-foreground mt-1">Add NEXA PMS to your home screen for quick access.</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
                <Button size="sm" onClick={handleInstallClick}>
                    Install
                </Button>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowPrompt(false)}>
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
