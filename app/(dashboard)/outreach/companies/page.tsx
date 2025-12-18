'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  Users,
  MapPin,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Mock data - Medical supply companies from the spreadsheet
const companies = [
  {
    id: '1',
    name: 'Dynarex Corporation',
    website: 'dynarex.com',
    phone: '888-396-2739',
    email: 'info@dynarex.com',
    location: 'Orangeburg, NY',
    employees: '500-1000',
    category: 'General Medical/DME',
    contacts: 3,
    status: 'Active',
    notes: 'Distributor program available',
  },
  {
    id: '2',
    name: 'Drive DeVilbiss Healthcare',
    website: 'drivemedical.com',
    phone: '877-224-0946',
    email: 'customerservice@drivemedical.com',
    location: 'Port Washington, NY',
    employees: '1000+',
    category: 'Mobility/Home Health',
    contacts: 2,
    status: 'Active',
    notes: 'Tech support available',
  },
  {
    id: '3',
    name: 'Graham Medical',
    website: 'grahammedical.com',
    phone: '800-558-6765',
    email: 'info@grahammedical.com',
    location: 'Green Bay, WI',
    employees: '100-500',
    category: 'Surgical/Wound Care',
    contacts: 1,
    status: 'Pending',
    notes: 'Contact form preferred',
  },
  {
    id: '4',
    name: 'ResMed',
    website: 'resmed.com',
    phone: '800-424-0737',
    email: 'privacy@resmed.com',
    location: 'San Diego, CA',
    employees: '1000+',
    category: 'Respiratory/CPAP',
    contacts: 4,
    status: 'Active',
    notes: 'Large enterprise account',
  },
  {
    id: '5',
    name: 'Carex Health Brands',
    website: 'carex.com',
    phone: '800-526-8051',
    email: 'customer.service@carex.com',
    location: 'Sioux Falls, SD',
    employees: '100-500',
    category: 'Home Health',
    contacts: 2,
    status: 'Active',
    notes: 'Consumer-focused',
  },
  {
    id: '6',
    name: 'Nova Medical Products',
    website: 'novajoy.com',
    phone: '800-557-6682',
    email: 'info@novajoy.com',
    location: 'Carson, CA',
    employees: '50-100',
    category: 'Mobility',
    contacts: 1,
    status: 'Inactive',
    notes: 'Follow up needed',
  },
  {
    id: '7',
    name: 'Omron Healthcare',
    website: 'omronhealthcare.com',
    phone: '866-216-1333',
    email: 'via website',
    location: 'Lake Forest, IL',
    employees: '500-1000',
    category: 'Diagnostic/Lab',
    contacts: 0,
    status: 'New',
    notes: 'Consumer and clinical products',
  },
  {
    id: '8',
    name: 'Fisher & Paykel Healthcare',
    website: 'fphcare.com',
    phone: 'via form',
    email: 'via form',
    location: 'Irvine, CA',
    employees: '1000+',
    category: 'Respiratory',
    contacts: 0,
    status: 'New',
    notes: 'Sales rep available',
  },
];

export default function CompaniesPage() {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedCompanies.includes(id)) {
      setSelectedCompanies(selectedCompanies.filter((c) => c !== id));
    } else {
      setSelectedCompanies([...selectedCompanies, id]);
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Companies</h1>
          <span className="text-sm text-muted-foreground">
            {companies.length} companies
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-1" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Add Company
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {selectedCompanies.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCompanies.length} selected
            </span>
            <Button variant="outline" size="sm">
              Start Campaign
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
                  checked={selectedCompanies.length === companies.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Company
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Category</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Location</th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Website</th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Contacts
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">
                <button className="flex items-center gap-1 hover:text-foreground text-muted-foreground">
                  Status
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">Notes</th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCompanies.map((company) => (
              <tr
                key={company.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-3">
                  <Checkbox
                    checked={selectedCompanies.includes(company.id)}
                    onCheckedChange={() => toggleSelect(company.id)}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <span className="font-medium">{company.name}</span>
                      <div className="text-xs text-muted-foreground">
                        {company.employees} employees
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    {company.category}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3" />
                    {company.location}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <a
                    href={`https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {company.website}
                    <ExternalLink className="size-3" />
                  </a>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="size-4 text-muted-foreground" />
                    {company.contacts}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      company.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : company.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : company.status === 'New'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {company.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                  {company.notes}
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
