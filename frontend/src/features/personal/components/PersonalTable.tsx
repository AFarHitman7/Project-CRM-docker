// PersonalTable.tsx
import React from "react";
import styles from "./PersonalTable.module.css";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL || "";

type Row = string[];

/** Client data from API */
interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  tax_status: string;
  loyalty?: string;
  phone: string;
  email: string;
  latest_tax_year?: number;
  latest_tax_date?: string;
  spouse_name?: string;
}

/** props for PersonalTable */
interface PersonalTableProps {
  search?: string;
  status?: string;
  filters?: Record<number, string | number | undefined>;
  filterFn?: (row: Row) => boolean;
  limit?: number;
  data?: Row[];
}

const headers: string[] = [
  "Client Name",
  "Status",
  "Loyalty",
  "Phone Number",
  "Email ID",
  "Tax Date",
  "Tax Year",
  "Spouse",
  "",
];

const getData = async (): Promise<Row[]> => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/api/pClient/?limit=0`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch data");
    }

    const result = await response.json();

    // Extract clients from the response
    const clients: ClientData[] = result.data || [];

    const rows = clients.map((client) => {
      return [
        client.id || "",
        `${client.first_name || ""} ${client.last_name || ""}`.trim(),
        client.tax_status || "N/A",
        client.loyalty || "-",
        client.phone || "N/A",
        client.email || "N/A",
        client.latest_tax_date ? formatDate(client.latest_tax_date) : "N/A",
        client.latest_tax_year?.toString() || "N/A",
        client.spouse_name || "N/A",
      ];
    });

    return rows;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";

  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const YYYY = d.getFullYear();

  return `${MM}/${DD}/${YYYY}`;
};

// Sorting helper functions
const getLoyaltyValue = (loyalty: string): number => {
  const normalized = loyalty;

  // Handle empty or invalid values
  if (normalized === "-" || normalized === "N/A" || normalized === "") {
    return -1; // Sort these to the end
  }

  const num = parseInt(normalized, 10);

  // Validate it's a number between 0 and 10
  if (isNaN(num)) {
    return -1; // Invalid values go to the end
  }

  return num;
};

const getStatusOrder = (status: string): number => {
  const normalized = status.toLowerCase().trim();
  // Lower number = higher priority
  switch (normalized) {
    case "inprogress":
      return 1;
    case "readyforreview":
      return 2;
    case "paperrecieved":
      return 3;
    case "filedon":
      return 4;
    case "n/a":
      return 999;
    default:
      return 500;
  }
};

const sortRows = (rows: Row[]): Row[] => {
  return [...rows].sort((a, b) => {
    // First sort by loyalty (index 3) - DESCENDING (10 to 0)
    const loyaltyA = getLoyaltyValue(a[3]);
    const loyaltyB = getLoyaltyValue(b[3]);

    if (loyaltyA !== loyaltyB) {
      return loyaltyB - loyaltyA; // Descending order (higher loyalty first)
    }

    // If loyalty is the same, sort by status (index 2)
    const statusA = getStatusOrder(a[2]);
    const statusB = getStatusOrder(b[2]);

    return statusA - statusB;
  });
};

const PersonalTable: React.FC<PersonalTableProps> = ({
  search = "",
  filterFn,
  limit,
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
        const result = await getData();
        // Sort the data after fetching
        const sorted = sortRows(result);
        setTableData(sorted);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if data prop is not provided
    if (!data) {
      fetchData();
    } else {
      // Sort provided data as well
      const sorted = sortRows(data);
      setTableData(sorted);
      setLoading(false);
    }
  }, [data]);

  const goToClient = (rawId?: string | number) => {
    const raw = rawId == null ? "" : String(rawId);
    const id = raw.startsWith("#") ? raw.substring(1) : raw;
    if (!id) return;
    navigate(`/personal/${id}`);
  };

  const normalizedSearch = String(search ?? "")
    .trim()
    .toLowerCase();

  const matchesFilters = (row: Row): boolean => {
    if (typeof filterFn === "function") return !!filterFn(row);

    if (normalizedSearch) {
      // Check each cell, excluding spouse column (index 8)
      for (let idx = 0; idx < row.length; idx++) {
        // Skip spouse column (index 8)
        if (idx === 8) continue;

        const cell = row[idx];
        const cellValue = String(cell ?? "");

        // Special handling for phone number (index 4)
        if (idx === 4) {
          // Remove all non-numeric characters from both the cell value and search term
          const numericCell = cellValue.replace(/\D/g, "");
          const numericSearch = normalizedSearch.replace(/\D/g, "");
          if (numericSearch && numericCell.includes(numericSearch)) {
            return true;
          }
        } else {
          // Standard search for other fields
          const lowerCellValue = cellValue.toLowerCase();
          if (lowerCellValue.includes(normalizedSearch)) {
            return true;
          }
        }
      }
      return false;
    }

    return true;
  };
  const filtered = tableData.filter(matchesFilters);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headers.map((h, idx) => (
            <th key={idx} className={styles.tableHeader}>
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
              No clients found
            </td>
          </tr>
        ) : (
          filtered
            .slice(0, limit ? limit : filtered.length)
            .map((row, rIdx) => (
              <tr
                key={rIdx}
                className={styles.rowClickable}
                onClick={() => goToClient(row[0])}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToClient(row[0]);
                  }
                }}
                role="link"
                aria-label={`Open client ${row[1] ?? row[0]}`}
              >
                {/* Client Name */}
                <td className={styles.tableCell}>{row[1]}</td>
                {/* Status */}
                <td
                  className={`${styles.tableCell} ${styles.statusCell} ${
                    styles[row[2].toLowerCase()]
                  }`}
                >
                  <span>{row[2]}</span>
                </td>
                {/* Loyalty */}
                <td className={styles.tableCell}>{row[3]}</td>
                {/* Phone */}
                <td className={styles.tableCell}>{row[4]}</td>
                {/* Email */}
                <td className={styles.tableCell}>{row[5]}</td>
                {/* Last Filed */}
                <td className={styles.tableCell}>{row[6]}</td>
                {/* Tax Year */}
                <td className={styles.tableCell}>{row[7]}</td>
                {/* Spouse */}
                <td className={styles.tableCell}>{row[8]}</td>
                {/* Action Button */}
                <td className={styles.tableCell}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToClient(row[0]);
                    }}
                    aria-label={`View details for ${row[1] ?? row[0]}`}
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

export default PersonalTable;
