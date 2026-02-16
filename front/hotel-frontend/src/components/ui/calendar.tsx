import * as React from "react"
import { DayPicker, UI, DayFlag, SelectionState } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            fixedWeeks
            className={cn("p-3", className)}
            style={{
                direction: "ltr",
            }}
            classNames={{
                [UI.Months]: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                [UI.Month]: "space-y-4",
                [UI.MonthCaption]: "flex justify-center pt-1 relative items-center",
                [UI.CaptionLabel]: "text-sm font-medium",
                [UI.Nav]: "space-x-1 flex items-center",
                [UI.PreviousMonthButton]: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
                ),
                [UI.NextMonthButton]: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
                ),
                [UI.MonthGrid]: "w-full border-collapse space-y-1",
                [UI.Weekdays]: "flex",
                [UI.Weekday]:
                    "text-slate-500 rounded-md w-9 font-normal text-[0.8rem] dark:text-slate-400",
                [UI.Week]: "flex w-full mt-2",
                [UI.Day]: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 dark:[&:has([aria-selected].day-outside)]:bg-slate-800/50 dark:[&:has([aria-selected])]:bg-slate-800",
                [UI.DayButton]: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                ),
                [SelectionState.range_end]: "day-range-end",
                [SelectionState.selected]:
                    "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50 dark:hover:text-slate-900 dark:focus:bg-slate-50 dark:focus:text-slate-900",
                [DayFlag.today]: "ring-1 ring-slate-400 rounded-md font-semibold text-slate-900 dark:ring-slate-500 dark:text-slate-50",
                [DayFlag.outside]:
                    "day-outside text-slate-500 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 opacity-50 dark:text-slate-400 dark:aria-selected:bg-slate-800/50 dark:aria-selected:text-slate-400",
                [DayFlag.disabled]: "text-slate-500 opacity-50 dark:text-slate-400",
                [SelectionState.range_middle]:
                    "aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-50",
                [DayFlag.hidden]: "invisible",
                ...classNames,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
