
import * as React from "react"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date?: DateRange
    setDate: (date?: DateRange) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const { i18n } = useTranslation()
    const locale = i18n.language === 'ar' ? ar : enUS
    const isRtl = i18n.language === 'ar'
    // Simple state for width response if needed, but CSS is better.
    // For Calendar numberOfMonths, we can check width.
    const [isSmallScreen, setIsSmallScreen] = React.useState(false);

    React.useEffect(() => {
        const check = () => setIsSmallScreen(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y", { locale })} -{" "}
                                    {format(date.to, "LLL dd, y", { locale })}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y", { locale })
                            )
                        ) : (
                            <span>{isRtl ? 'اختر التاريخ' : 'Pick a date'}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={isSmallScreen ? 1 : 2}
                        locale={locale}
                        dir={isRtl ? 'rtl' : 'ltr'}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
