'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Mock data - Attio-style people records
const people = [
  {
    id: '1',
    name: 'John Smith',
    email: 'info@dynarex.com',
    phone: '888-396-2739',
    company: 'Dynarex Corporation',
    role: 'Sales Director',
    status: 'Active',
    lastContacted: '2 days ago',
    tags: ['Vendor', 'DME'],
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'customerservice@drivemedical.com',
    phone: '877-224-0946',
    company: 'Drive DeVilbiss',
    role: 'Account Manager',
    status: 'Active',
    lastContacted: '1 week ago',
    tags: ['Vendor', 'Mobility'],
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'info@grahammedical.com',
    phone: '800-558-6765',
    company: 'Graham Medical',
    role: 'Regional Manager',
    status: 'Pending',
    lastContacted: 'Never',
    tags: ['Vendor', 'Wound Care'],
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'privacy@resmed.com',
    phone: '800-424-0737',
    company: 'ResMed',
    role: 'Partnership Lead',
    status: 'Active',
    lastContacted: '3 days ago',
    tags: ['Vendor', 'Respiratory'],
  },
  {
    id: '5',
    name: 'Robert Wilson',
    email: 'info@novajoy.com',
    phone: '800-557-6682',
    company: 'Nova Medical',
    role: 'VP Sales',
    status: 'Inactive',
    lastContacted: '1 month ago',
    tags: ['Vendor', 'Mobility'],
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    email: 'customer.service@carex.com',
    phone: '800-526-8051',
    company: 'Carex Health',
    role: 'Business Development',
    status: 'Active',
    lastContacted: '5 days ago',
    tags: ['Vendor', 'Home Health'],
  },
];

export default function PeoplePage() {
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelectAll = () => {
    if (selectedPeople.length === people.length) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(people.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedPeople.includes(id)) {
      setSelectedPeople(selectedPeople.filter((p) => p !== id));
    } else {
      setSelectedPeople([...selectedPeople, id]);
    }
  };

  const filteredPeople = people.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">People</h1>
          <span className="text-sm text-muted-foreground">
            {people.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-1" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Add Person
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {selectedPeople.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedPeople.length} selected
            </span>
            <Button variant="outline" size="sm">
              <Mail className="size-4 mr-1" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="size-4 mr-1" />
              Call
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-left text-sm">
              <th className="w-12 px-6 py-3">
                <Checkbox
                  checked={selectedPeople.length === people.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Name
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Company
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Status
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Last Contacted</th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPeople.map((person) => (
              <tr
                key={person.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-3">
                  <Checkbox
                    checked={selectedPeople.includes(person.id)}
                    onCheckedChange={() => toggleSelect(person.id)}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {person.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="font-medium">{person.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-sm">{person.company}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {person.role}
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {person.email}
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {person.phone}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      person.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : person.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {person.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {person.lastContacted}
                </td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
