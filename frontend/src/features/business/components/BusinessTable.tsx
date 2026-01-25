// BusinessTable.tsx
import React from "react";
import styles from "./BusinessTable.module.css";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

type Row = string[];

/** Business data from API */
interface BusinessData {
  id: string;
  business_name: string;
  business_number?: string;
  business_type?: string;
  phone_cell?: string;
  email?: string;
  contact_name?: string;
  fiscal_year_end?: string;
  created_at?: string;
}

interface BusinessTableProps {
  search?: string;
  filterFn?: (row: Row) => boolean;
  data?: Row[];
}

// 1. Updated Headers Order
const headers: string[] = [
  "Name",
  "CRA Access",
  "Business Number", // Moved Business Number after Type
  "Phone Number",
  "Email",
  "Contact Name",
  "Fiscal Year End",
  "", // View Details button column
];

const getData = async (): Promise<Row[]> => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/bClient/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to fetch businesses");
  }

  const result = await res.json();
  const businesses: BusinessData[] = result.data || [];

  return businesses.map((b) => {
    // Format Fiscal Year End
    let fiscalString = "—";
    if (b.fiscal_year_end) {
      const date = new Date(b.fiscal_year_end);
      fiscalString = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    // 2. Map data to strict array indices matching headers
    return [
      b.id, // 0: ID (Hidden)
      b.business_name || "—", // 1: Name
      b.business_type || "—", // 2: Type
      b.business_number || "—", // 3: Business Number
      b.phone_cell || "—", // 4: Phone Number
      b.email || "—", // 5: Email
      b.contact_name || "—", // 6: Contact Name
      fiscalString, // 7: Fiscal Year End
    ];
  });
};

const BusinessTable: React.FC<BusinessTableProps> = ({
  search = "",
  filterFn,
  data,
}) => {
  const navigate = useNavigate();

  const [tableData, setTableData] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const rows = await getData();
        setTableData(rows);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (!data) fetchData();
    else {
      setTableData(data);
      setLoading(false);
    }
  }, [data]);

  const goToBusiness = (rawId?: string | number) => {
    const id = String(rawId || "");
    if (!id) return;
    navigate(`/business/${id}`);
  };

  const normalizedSearch = search.trim().toLowerCase();

  const matchesFilters = (row: Row): boolean => {
    if (typeof filterFn === "function") return !!filterFn(row);

    if (!normalizedSearch) return true;

    // Iterate through visible columns (indices 1 to 7)
    for (let i = 1; i < row.length; i++) {
      const cell = String(row[i] ?? "");

      // Basic text match
      if (cell.toLowerCase().includes(normalizedSearch)) return true;

      // Phone normalization (Index 4 is Phone Number now)
      if (i === 4) {
        const cellNum = cell.replace(/\D/g, "");
        const searchNum = normalizedSearch.replace(/\D/g, "");
        if (searchNum && cellNum.includes(searchNum)) return true;
      }
    }

    return false;
  };

  const filtered = tableData.filter(matchesFilters);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className={styles.tableHeader}>
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {filtered.length === 0 ? (
          <tr>
            <td
              colSpan={headers.length}
              style={{ textAlign: "center", padding: "20px" }}
            >
              No businesses found
            </td>
          </tr>
        ) : (
          filtered.map((row, idx) => (
            <tr
              key={idx}
              className={styles.rowClickable}
              onClick={() => goToBusiness(row[0])}
              tabIndex={0}
              role="link"
              aria-label={`Open business ${row[1]}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToBusiness(row[0]);
                }
              }}
            >
              {/* 3. Render cells matching the order in getData */}
              <td className={styles.tableCell}>{row[1]}</td> {/* Name */}
              <td className={styles.tableCell}>{row[2]}</td> {/* Type */}
              <td className={styles.tableCell}>{row[3]}</td> {/* Number */}
              <td className={styles.tableCell}>{row[4]}</td> {/* Phone */}
              <td className={styles.tableCell}>{row[5]}</td> {/* Email */}
              <td className={styles.tableCell}>{row[6]}</td> {/* Contact */}
              <td className={styles.tableCell}>{row[7]}</td> {/* Fiscal Year */}
              <td className={styles.tableCell}>
                <button
                  className={styles.viewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToBusiness(row[0]);
                  }}
                >
                  View details
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default BusinessTable;
