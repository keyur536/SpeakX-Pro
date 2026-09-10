import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import axios from "axios"

interface EntityComboboxProps {
  endpoint: string // API endpoint to fetch list, e.g. "/api/v1/admin/courses"
  label: string
  onSelect: (id: int) => void
  value?: number
  valueKey?: string // e.g. "id"
  displayKey?: string // e.g. "name" or "username" or "code"
}

export function EntityCombobox({ 
  endpoint, 
  label, 
  onSelect, 
  value, 
  valueKey = "id", 
  displayKey = "name" 
}: EntityComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    const fetchItems = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`http://localhost:8000${endpoint}`, {
          withCredentials: true
        })
        if (mounted) setItems(res.data)
      } catch (err) {
        console.error("Error fetching combobox data:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchItems()
    return () => { mounted = false }
  }, [endpoint])

  const selectedItem = items.find((item) => item[valueKey] === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between focus:ring-2 focus:ring-accent font-sans"
        >
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : selectedItem ? (
            selectedItem[displayKey]
          ) : (
            `Select ${label}...`
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[200px] p-0 border-accent/20 bg-card">
        <Command>
          <CommandInput placeholder={`Search ${label}...`} className="font-sans" />
          <CommandList>
            <CommandEmpty>No {label} found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item[valueKey]}
                  value={item[displayKey]}
                  className="font-sans data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                  onSelect={() => {
                    onSelect(item[valueKey])
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item[valueKey] ? "opacity-100 text-accent" : "opacity-0"
                    )}
                  />
                  {item[displayKey]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
