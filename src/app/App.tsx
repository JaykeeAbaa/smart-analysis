import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  Users, UserCheck, Activity, Shield, FilePlus, Download, ArrowUp, ArrowDown, Copy, Search, Filter, ChevronLeft, ChevronRight, Upload,
} from "lucide-react";

// ─── Utility Components ────────────────────────────────────────────────────────

const CHART_COLORS = ["#1B3A8C", "#0EA5E9", "#E8900A", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4", "#84CC16", "#94A3B8"];

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" | "purple"; className?: string }) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, trend, color = "blue", onClick, isActive }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: { value: number; up: boolean };
  color?: "blue" | "amber" | "green" | "purple" | "red" | "sky" | "emerald" | "slate";
  onClick?: () => void;
  isActive?: boolean;
}) {
  const colors = {
    blue: "bg-[#1B3A8C] text-white",
    amber: "bg-[#E8900A] text-white",
    green: "bg-emerald-600 text-white",
    purple: "bg-purple-600 text-white",
    red: "bg-red-600 text-white",
    sky: "bg-sky-500 text-white",
    emerald: "bg-emerald-600 text-white",
    slate: "bg-slate-600 text-white",
  };
  const iconBg = {
    blue: "bg-white/20",
    amber: "bg-white/20",
    green: "bg-white/20",
    purple: "bg-white/20",
    red: "bg-white/20",
    sky: "bg-white/20",
    emerald: "bg-white/20",
    slate: "bg-white/20",
  };
  return (
    <div 
      className={`rounded-xl p-5 ${colors[color]} shadow-sm cursor-pointer transition-all duration-200 ${isActive ? 'ring-4 ring-yellow-400' : 'hover:ring-2 hover:ring-yellow-300'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend.up ? "text-white/80" : "text-white/80"}`}>
            {trend.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-white/80 font-medium">{label}</div>
      {sub && <div className="text-xs text-white/60 mt-1">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ─── CSV Parsing and Data Cleaning Logic ─────────────────────────────────────────────

interface Participant {
  id: number;
  [key: string]: any;
  name?: string;
  email?: string;
  mobile?: string;
  sex?: string;
  age?: number;
  municipality?: string;
  agency?: string;
  position?: string;
  sector?: string;
  category?: string;
  course?: string;
  date?: string;
  isDuplicate: boolean;
  duplicateReasons: string[];
}

// Parse CSV string
const parseCSV = (csvText: string) => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], data: [] };

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    data.push(row);
  }
  
  return { headers, data };
};

const parseCSVLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let inQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuote) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuote = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
};

// Normalize/clean values
const normalizeString = (str: string) => {
  return str.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
};

const normalizeMobile = (mobile: string) => {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) {
    return "0" + digits;
  }
  if (digits.length === 11 && digits.startsWith("09")) {
    return digits;
  }
  return digits;
};

const normalizeEmail = (email: string) => {
  return email.toLowerCase().trim();
};

// Define keyword sets for each sector
const sectorKeywords = {
  "PWD": [
    "pwd", "person with disability", "persons with disability", "disabled", "differently abled",
    "handicapped", "with disability"
  ],
  "Out of School Youth": [
    "osy", "out of school", "out-of-school", "out of school youth", "out-of-school youth"
  ],
  "Students": [
    "student", "students", "studente", "scholar", "pupil", "enrolled", "enrollee",
    "college student", "high school student", "elementary student"
  ],
  "Indigenous People": [
    "indigenous", "ip", "indigenous people", "indigenous peoples", "lumad", "tribal",
    "tribe", "cultural community", "ancestral"
  ],
  "Teachers/Educators": [
    "teacher", "teachers", "educator", "educators", "instructor", "instructors",
    "professor", "professors", "faculty", "mentor", "tutor", "teaching", "education",
    "deped", "ched", "tesda instructor"
  ],
  "Senior Citizen": [
    "senior", "senior citizen", "senior citizens", "elderly", "elder", "60 and above",
    "older person", "older persons", "golden age"
  ]
};

// Helper function to check which sector a participant belongs to
const getParticipantSector = (d: Participant): string => {
  const allText = Object.values(d)
    .map(v => (v || "").toString().toLowerCase())
    .join(" ");

  // Check sectors in priority order
  if (sectorKeywords["PWD"].some(keyword => allText.includes(keyword))) {
    return "PWD";
  } else if (sectorKeywords["Out of School Youth"].some(keyword => allText.includes(keyword))) {
    return "Out of School Youth";
  } else if (sectorKeywords["Students"].some(keyword => allText.includes(keyword))) {
    return "Students";
  } else if (sectorKeywords["Indigenous People"].some(keyword => allText.includes(keyword))) {
    return "Indigenous People";
  } else if (sectorKeywords["Teachers/Educators"].some(keyword => allText.includes(keyword))) {
    return "Teachers/Educators";
  } else if (sectorKeywords["Senior Citizen"].some(keyword => allText.includes(keyword))) {
    return "Senior Citizen";
  } else {
    return "Others";
  }
};

// Smart column detection
const detectColumns = (headers: string[]) => {
  const columnMap: { [key: string]: string } = {};
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes("last name") || lowerHeader.includes("lastname") || lowerHeader.includes("surname")) {
      columnMap["lastName"] = header;
    } else if (lowerHeader.includes("first name") || lowerHeader.includes("firstname")) {
      columnMap["firstName"] = header;
    } else if (lowerHeader.includes("middle name") || lowerHeader.includes("middlename") || lowerHeader.includes("middle initial")) {
      columnMap["middleName"] = header;
    } else if (lowerHeader.includes("name") && !columnMap["name"] && !columnMap["firstName"] && !columnMap["lastName"]) {
      columnMap["name"] = header;
    } else if (lowerHeader.includes("email") || lowerHeader.includes("e-mail")) {
      columnMap["email"] = header;
    } else if (lowerHeader.includes("mobile") || lowerHeader.includes("phone") || lowerHeader.includes("cell") || lowerHeader.includes("contact") || lowerHeader.includes("number")) {
      columnMap["mobile"] = header;
    } else if (lowerHeader.includes("sex") || lowerHeader.includes("gender")) {
      columnMap["sex"] = header;
    } else if (lowerHeader.includes("age")) {
      columnMap["age"] = header;
    } else if (lowerHeader.includes("municipality") || lowerHeader.includes("city")) {
      columnMap["municipality"] = header;
    } else if (lowerHeader.includes("agency") || lowerHeader.includes("organization") || lowerHeader.includes("office")) {
      columnMap["agency"] = header;
    } else if (lowerHeader.includes("position") || lowerHeader.includes("role")) {
      columnMap["position"] = header;
    } else if (lowerHeader.includes("sector")) {
      columnMap["sector"] = header;
    } else if (lowerHeader.includes("category")) {
      columnMap["category"] = header;
    } else if (lowerHeader.includes("course") || lowerHeader.includes("training") || lowerHeader.includes("program")) {
      columnMap["course"] = header;
    } else if (lowerHeader.includes("date")) {
      columnMap["date"] = header;
    }
  });
  
  return columnMap;
};

// Clean data and detect duplicates
const processData = (rawData: any[], columnMap: { [key: string]: string }) => {
  const normalizedData: Participant[] = [];
  const seen: { [key: string]: number[] } = {}; // key -> array of ids
  
  rawData.forEach((row, index) => {
    const participant: Participant = {
      id: index + 1,
      isDuplicate: false,
      duplicateReasons: [],
    };
    
    // Map and clean fields
    Object.keys(columnMap).forEach(key => {
      const value = row[columnMap[key]] || "";
      
      if (key === "age") {
        participant[key] = parseInt(value) || undefined;
      } else {
        participant[key] = value;
      }
    });

    // Determine full name
    let fullName = "";
    if (columnMap["firstName"] && columnMap["lastName"]) {
      const firstName = (row[columnMap["firstName"]] || "").toString();
      const lastName = (row[columnMap["lastName"]] || "").toString();
      const middleName = (columnMap["middleName"] ? (row[columnMap["middleName"]] || "").toString() : "");
      fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, " ");
      participant["firstName"] = firstName;
      participant["lastName"] = lastName;
      if (middleName) {
        participant["middleName"] = middleName;
      }
    } else if (columnMap["name"]) {
      fullName = (row[columnMap["name"]] || "").toString();
    }

    const normalizedFullName = normalizeString(fullName);
    const normalizedEmail = columnMap["email"] ? normalizeEmail(row[columnMap["email"]] || "") : "";
    const normalizedMobile = columnMap["mobile"] ? normalizeMobile(row[columnMap["mobile"]] || "") : "";

    // Generate normalized keys for duplicate detection - full name + number OR full name + email
    const keysToCheck: { key: string; value: string; reason: string }[] = [];
    
    if (normalizedFullName && normalizedMobile) {
      keysToCheck.push({ 
        key: `fullname-mobile:${normalizedFullName}-${normalizedMobile}`, 
        value: normalizedFullName, 
        reason: "Same Full Name + Mobile" 
      });
    }

    if (normalizedFullName && normalizedEmail) {
      keysToCheck.push({ 
        key: `fullname-email:${normalizedFullName}-${normalizedEmail}`, 
        value: normalizedFullName, 
        reason: "Same Full Name + Email" 
      });
    }

    // Also keep individual checks as fallback
    if (normalizedFullName) {
      keysToCheck.push({ key: `name:${normalizedFullName}`, value: normalizedFullName, reason: "Same Full Name" });
    }
    
    if (normalizedEmail) {
      keysToCheck.push({ key: `email:${normalizedEmail}`, value: normalizedEmail, reason: "Same Email" });
    }
    
    if (normalizedMobile) {
      keysToCheck.push({ key: `mobile:${normalizedMobile}`, value: normalizedMobile, reason: "Same Mobile" });
    }
    
    // Check for duplicates
    keysToCheck.forEach(({ key, reason }) => {
      if (seen[key]) {
        participant.isDuplicate = true;
        if (!participant.duplicateReasons.includes(reason)) {
          participant.duplicateReasons.push(reason);
        }
        // Also mark previous one as duplicate
        seen[key].forEach(prevId => {
          const prev = normalizedData.find(p => p.id === prevId);
          if (prev) {
            prev.isDuplicate = true;
            if (!prev.duplicateReasons.includes(reason)) {
              prev.duplicateReasons.push(reason);
            }
          }
        });
      } else {
        seen[key] = [];
      }
      seen[key].push(participant.id);
    });
    
    normalizedData.push(participant);
  });
  
  return normalizedData;
};

// ─── Data Table Component ────────────────────────────────────────────────────────

type FilterType = "all" | "unique" | "duplicates";

interface DataTableProps {
  data: Participant[];
  activeSector: string | null;
}

function DataTable({ data, activeSector }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Filter and search data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = !searchQuery || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );

      let matchesFilter = true;
      if (filterType === "unique") {
        matchesFilter = !item.isDuplicate;
      } else if (filterType === "duplicates") {
        matchesFilter = item.isDuplicate;
      }

      const matchesSector = !activeSector || getParticipantSector(item) === activeSector;

      return matchesSearch && matchesFilter && matchesSector;
    });
  }, [searchQuery, filterType, data, activeSector]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  // Get visible columns (all keys in data except isDuplicate and duplicateReasons)
  const visibleColumns = useMemo(() => {
    if (data.length === 0) return [];
    const allKeys = Object.keys(data[0]);
    return allKeys.filter(key => !["isDuplicate", "duplicateReasons"].includes(key));
  }, [data]);

  return (
    <ChartCard title="Cleaned Participant Data" subtitle={`${data.length} records processed`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search across all fields…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-white"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="text-xs border border-border rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Records</option>
            <option value="unique">Unique Only</option>
            <option value="duplicates">All Duplicates</option>
          </select>
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs border border-border rounded-lg px-3 py-2 bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="text-left py-2 px-3 text-muted-foreground font-semibold whitespace-nowrap w-10">#</th>
              {visibleColumns.map((col) => (
                <th key={col} className="text-left py-2 px-3 text-muted-foreground font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                  {col}
                </th>
              ))}
              <th className="text-left py-2 px-3 text-muted-foreground font-semibold whitespace-nowrap w-20">Status</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-semibold whitespace-nowrap w-32">Duplicate Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-muted-foreground font-mono">{startIndex + index + 1}</td>
                  {visibleColumns.map((col) => (
                    <td key={col} className="py-2 px-3 text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {item[col]}
                    </td>
                  ))}
                  <td className="py-2 px-3">
                    <Badge variant={item.isDuplicate ? "warning" : "success"} className="text-[10px] px-2 py-0.5">
                      {item.isDuplicate ? "Duplicate" : "Unique"}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    {item.duplicateReasons.length > 0 ? (
                      <div className="flex flex-nowrap gap-0.5 overflow-hidden">
                        {item.duplicateReasons.slice(0, 1).map((reason) => (
                          <Badge key={reason} variant="info" className="flex-shrink-0 text-[10px] px-2 py-0.5">
                            {reason}
                          </Badge>
                        ))}
                        {item.duplicateReasons.length > 1 && (
                          <span className="text-muted-foreground flex-shrink-0 text-[10px]">+{item.duplicateReasons.length - 1}</span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={3 + visibleColumns.length} 
                  className="py-8 text-center text-muted-foreground text-sm"
                >
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredData.length)} of {filteredData.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${currentPage === pageNum ? "bg-[#1B3A8C] text-white" : "bg-white border border-border hover:bg-slate-50"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// ─── Dashboard View ────────────────────────────────────────────────────────────

interface DashboardViewProps {
  data: Participant[];
  activeSector: string | null;
  onSectorClick: (sector: string | null) => void;
}

function DashboardView({ data, activeSector, onSectorClick }: DashboardViewProps) {
  const stats = useMemo(() => {
    const totalParticipants = data.length;
    const uniqueCount = data.filter(d => !d.isDuplicate).length;
    const duplicateCount = data.filter(d => d.isDuplicate).length;
    const dataQualityScore = Math.round((uniqueCount / Math.max(totalParticipants, 1)) * 100);
    
    // Sector counts
    const sectorCounts: { [key: string]: number } = {
      "PWD": 0,
      "Out of School Youth": 0,
      "Students": 0,
      "Indigenous People": 0,
      "Teachers/Educators": 0,
      "Senior Citizen": 0,
      "Others": 0,
    };

    data.forEach(d => {
      const sector = getParticipantSector(d);
      sectorCounts[sector]++;
    });

    // Basic charts data
    const sexCounts: { [key: string]: number } = {};
    data.forEach(d => {
      if (d.sex) {
        const key = d.sex;
        sexCounts[key] = (sexCounts[key] || 0) + 1;
      }
    });
    const sexData = Object.entries(sexCounts).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const ageGroups: { [key: string]: number } = {};
    data.forEach(d => {
      let group = "Unknown";
      if (typeof d.age === "number") {
        if (d.age < 25) group = "15-24";
        else if (d.age < 35) group = "25-34";
        else if (d.age < 45) group = "35-44";
        else if (d.age < 55) group = "45-54";
        else if (d.age < 65) group = "55-64";
        else group = "65+";
      }
      ageGroups[group] = (ageGroups[group] || 0) + 1;
    });
    const ageData = Object.entries(ageGroups).map(([group, count]) => ({
      group,
      count,
    }));

    return { totalParticipants, uniqueCount, duplicateCount, dataQualityScore, sexData, ageData, sectorCounts };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* KPI Row - Full Width */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        <StatCard 
          label="PWD" 
          value={stats.sectorCounts["PWD"]} 
          icon={Users} 
          color="purple"
          onClick={() => onSectorClick("PWD")}
          isActive={activeSector === "PWD"}
        />
        <StatCard 
          label="Out of School Youth" 
          value={stats.sectorCounts["Out of School Youth"]} 
          icon={Users} 
          color="amber"
          onClick={() => onSectorClick("Out of School Youth")}
          isActive={activeSector === "Out of School Youth"}
        />
        <StatCard 
          label="Students" 
          value={stats.sectorCounts["Students"]} 
          icon={Users} 
          color="green"
          onClick={() => onSectorClick("Students")}
          isActive={activeSector === "Students"}
        />
        <StatCard 
          label="Indigenous People" 
          value={stats.sectorCounts["Indigenous People"]} 
          icon={Users} 
          color="sky"
          onClick={() => onSectorClick("Indigenous People")}
          isActive={activeSector === "Indigenous People"}
        />
        <StatCard 
          label="Teachers/Educators" 
          value={stats.sectorCounts["Teachers/Educators"]} 
          icon={Users} 
          color="red"
          onClick={() => onSectorClick("Teachers/Educators")}
          isActive={activeSector === "Teachers/Educators"}
        />
        <StatCard 
          label="Senior Citizen" 
          value={stats.sectorCounts["Senior Citizen"]} 
          icon={Users} 
          color="emerald"
          onClick={() => onSectorClick("Senior Citizen")}
          isActive={activeSector === "Senior Citizen"}
        />
      </div>
      
      {/* Reset Button */}
      {activeSector && (
        <div className="flex justify-start">
          <button
            onClick={() => onSectorClick(null)}
            className="flex items-center gap-2 text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            <span className="text-xs">Show All Participants</span>
          </button>
        </div>
      )}

      {/* Charts Row 1 - Always show the structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Sex-Disaggregated Participants" subtitle="Distribution by gender identity">
          {stats.sexData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.sexData} cx="40%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {stats.sexData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {stats.sexData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground font-mono">{d.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No data to display
            </div>
          )}
        </ChartCard>

        <ChartCard title="Age Group Distribution" subtitle="Participants by age range">
          {stats.ageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.ageData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="group" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Participants" fill="#1B3A8C" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No data to display
            </div>
          )}
        </ChartCard>
      </div>

      {/* Data Table - Always show the structure */}
      <div className="mt-6">
        <DataTable data={data} activeSector={activeSector} />
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// Helper to export CSV
const exportCSV = (data: Participant[], filename: string = "unique_participants.csv") => {
  if (data.length === 0) return;
  
  const visibleColumns = Object.keys(data[0]).filter(key => !["isDuplicate", "duplicateReasons"].includes(key));
  
  const headerRow = visibleColumns.join(",");
  const dataRows = data.map(item => {
    return visibleColumns.map(col => {
      const value = item[col] ?? "";
      // Escape quotes and commas
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",");
  });
  
  const csvContent = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [data, setData] = useState<Participant[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const { headers, data: rawData } = parseCSV(csvText);
        const columnMap = detectColumns(headers);
        const processedData = processData(rawData, columnMap);
        setData(processedData);
      } catch (error) {
        console.error("Error processing CSV file:", error);
        alert("Error processing CSV file. Please check the file format.");
      } finally {
        setUploading(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleExport = () => {
    const uniqueRecords = data.filter(item => !item.isDuplicate);
    exportCSV(uniqueRecords, "unique_participants.csv");
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Outfit', sans-serif", background: "var(--background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4A7FE8] flex items-center justify-center flex-shrink-0">
            <div className="w-5 h-5 text-white font-bold text-center">D</div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              DICT Analytics Monitoring System
            </h1>
            <p className="text-xs text-muted-foreground">
              Department of Information and Communications Technology — NCR
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? "Processing..." : "Import CSV"}
          </button>
          <button 
            onClick={handleExport}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 text-xs bg-[#1B3A8C] text-white px-3 py-2 rounded-lg font-medium hover:bg-[#152D6E] transition-colors disabled:opacity-50">
            <Download size={14} />
            Export Unique
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-5 lg:p-6">
        <SectionHeader
          title="Executive Dashboard"
          subtitle={data.length > 0 ? `${data.length} records processed from uploaded CSV` : "Ready for data import"}
        />
        <DashboardView 
          data={data} 
          activeSector={activeSector} 
          onSectorClick={setActiveSector}
        />
      </main>
    </div>
  );
}
