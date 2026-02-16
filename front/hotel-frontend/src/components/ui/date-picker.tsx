
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className }: DatePickerProps) {
    const { i18n } = useTranslation()
    const locale = i18n.language === 'ar' ? ar : enUS
    const isRtl = i18n.language === 'ar'

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={locale}
                    dir={isRtl ? 'rtl' : 'ltr'}
                />
            </PopoverContent>
        </Popover>
    )
}
