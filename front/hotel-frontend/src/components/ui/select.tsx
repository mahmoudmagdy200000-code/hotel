import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
    value?: string | number; // Support string or number values common in enums
    onValueChange?: (value: string) => void;
}

const SelectContext = React.createContext<{
    value?: string | number;
    onValueChange?: (value: string) => void;
    getValueLabel?: (value: string | number) => string;
}>({});

const Select = ({ children, value, onValueChange, className, ...props }: SelectProps & { children: React.ReactNode }) => {
    // Map of value to label string
    const valueLabelMap = React.useMemo(() => {
        const map = new Map<string | number, string>();

        const traverse = (nodes: React.ReactNode) => {
            React.Children.forEach(nodes, node => {
                if (React.isValidElement(node)) {
                    if ((node.type as any).displayName === 'SelectItem') {
                        const props = node.props as { value: string | number, children?: React.ReactNode };
                        if (props.children && typeof props.children === 'string') {
                            map.set(props.value, props.children);
                        } else if (Array.isArray(props.children) && typeof props.children[0] === 'string') {
                            map.set(props.value, props.children[0]);
                        } else {
                            map.set(props.value, props.value.toString());
                        }
                    } else if (node.props && (node.props as any).children) {
                        traverse((node.props as any).children);
                    }
                }
            });
        };

        traverse(children);
        return map;
    }, [children]);

    const getValueLabel = (val: string | number) => {
        return valueLabelMap.get(val) || val.toString();
    };

    // Extract options for the native select (only SelectItem components are valid as children of native select)
    const extractItems = (nodes: React.ReactNode): React.ReactNode[] => {
        const items: React.ReactNode[] = [];
        React.Children.forEach(nodes, node => {
            if (React.isValidElement(node)) {
                if ((node.type as any).displayName === 'SelectItem') {
                    items.push(node);
                } else if ((node.type as any).displayName === 'SelectContent' || !((node.type as any).displayName)) {
                    // Recurse into SelectContent or generic wrappers (like fragments or arrays)
                    items.push(...extractItems((node.props as any).children));
                }
            }
        });
        return items;
    };

    const options = extractItems(children);

    return (
        <SelectContext.Provider value={{ value, onValueChange, getValueLabel }}>
            <div className={cn("relative w-full", className)}>
                <select
                    className={cn(
                        "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        "opacity-0 absolute inset-0 z-10 cursor-pointer" // Hide native select but keep it clickable and functional
                    )}
                    value={value?.toString()} // Ensure string for the underlying select
                    onChange={(e) => onValueChange?.(e.target.value)}
                    {...props}
                >
                    {options}
                </select>

                {/* Visual Representation */}
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pointer-events-none">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {/* Find the Trigger child to show icons etc */}
                        {React.Children.map(children, child => {
                            if (React.isValidElement(child) && (child.type as any).displayName === 'SelectTrigger') {
                                return child;
                            }
                            return null;
                        })}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </div>
            </div>
        </SelectContext.Provider>
    );
};

const SelectTrigger = ({ children, className }: { children?: React.ReactNode, className?: string }) => (
    <div className={cn("flex items-center w-full", className)}>{children}</div>
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
    const { value, getValueLabel } = React.useContext(SelectContext);

    const displayValue = React.useMemo(() => {
        if (value === undefined || value === null || value === '') return placeholder;
        return getValueLabel ? getValueLabel(value) : value.toString();
    }, [value, getValueLabel, placeholder]);

    return <span className="truncate">{displayValue}</span>;
};
SelectValue.displayName = 'SelectValue';

const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectContent.displayName = 'SelectContent';

const SelectItem = ({ value, children }: { value: string | number; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
);
SelectItem.displayName = 'SelectItem';

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
}
