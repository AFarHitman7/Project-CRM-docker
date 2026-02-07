// PersonalTable.tsx - Fixed with proper server-side search
import React from "react";
import styles from "./PersonalTable.module.css";
import { useNavigate } from "react-router-dom";
import { FaStar, FaRegStar } from "react-icons/fa";
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

/** API Response */
interface ApiResponse {
  data: ClientData[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
}

/** props for PersonalTable */
interface PersonalTableProps {
  search?: string;
  status?: string;
  filters?: Record<number, string | number | undefined>;
  filterFn?: (row: Row) => boolean;
  limit?: number;
  data?: Row[];
  enablePagination?: boolean;
  itemsPerPage?: number;
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

const getData = async (
  page: number = 1,
  limit: number = 50,
  search: string = "",
): Promise<{ rows: Row[]; meta: ApiResponse["meta"] }> => {
  try {
    const token = localStorage.getItem("token");

    // Build query params
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (search.trim()) {
      params.append("search", search.trim());
    }

    const response = await fetch(
      `${API_URL}/api/pClient/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch data");
    }

    const result: ApiResponse = await response.json();

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

    return { rows, meta: result.meta };
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
    case "paperreceived":
      return 1;
    case "inprogress":
      return 2;
    case "readytofile":
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
  enablePagination = false,
  itemsPerPage = 50,
}) => {
  const navigate = useNavigate();
  const [tableData, setTableData] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);

  // Keep track of previous search to detect changes
  const prevSearchRef = React.useRef(search);

  React.useEffect(() => {
    // Reset to page 1 when search changes
    if (search !== prevSearchRef.current) {
      setCurrentPage(1);
      prevSearchRef.current = search;
    }
  }, [search]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (enablePagination) {
          // Server-side pagination with search
          const { rows, meta } = await getData(
            currentPage,
            itemsPerPage,
            search,
          );
          setTableData(rows);
          setTotalPages(meta.pages);
          setTotalItems(meta.total);
        } else {
          // Fetch all data (limit=0)
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

          const result: ApiResponse = await response.json();
          const clients: ClientData[] = result.data || [];

          const rows = clients.map((client) => [
            client.id || "",
            `${client.first_name || ""} ${client.last_name || ""}`.trim(),
            client.tax_status || "N/A",
            client.loyalty || "-",
            client.phone || "N/A",
            client.email || "N/A",
            client.latest_tax_date ? formatDate(client.latest_tax_date) : "N/A",
            client.latest_tax_year?.toString() || "N/A",
            client.spouse_name || "N/A",
          ]);

          const sorted = sortRows(rows);
          setTableData(sorted);
        }
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
  }, [data, currentPage, enablePagination, itemsPerPage, search]);

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

    if (normalizedSearch && !enablePagination) {
      // Client-side search only when pagination is disabled
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

  const filtered = enablePagination
    ? tableData
    : tableData.filter(matchesFilters);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPaginationControls = () => {
    if (!enablePagination || totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className={styles.paginationContainer}>
        <div className={styles.paginationInfo}>
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}{" "}
          to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
          {totalItems === 1 ? "client" : "clients"}
        </div>
        <div className={styles.paginationControls}>
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            «
          </button>
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          {startPage > 1 && (
            <>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(1)}
              >
                1
              </button>
              {startPage > 2 && (
                <span className={styles.paginationEllipsis}>...</span>
              )}
            </>
          )}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              className={`${styles.paginationButton} ${
                currentPage === pageNum ? styles.paginationActive : ""
              }`}
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className={styles.paginationEllipsis}>...</span>
              )}
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.tableWrapper}>
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
                {search
                  ? `No clients found matching "${search}"`
                  : "No clients found"}
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
                  <td className={styles.tableCell}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0",
                      }}
                    >
                      <div style={{ display: "flex", gap: "1px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star}>
                            {Number(row[3]) >= star ? (
                              <FaStar
                                style={{ color: "#FFD700", fontSize: "12px" }}
                              />
                            ) : (
                              <FaRegStar
                                style={{ color: "#FFD700", fontSize: "12px" }}
                              />
                            )}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "1px" }}>
                        {[6, 7, 8, 9, 10].map((star) => (
                          <span key={star}>
                            {Number(row[3]) >= star ? (
                              <FaStar
                                style={{ color: "#FFD700", fontSize: "12px" }}
                              />
                            ) : (
                              <FaRegStar
                                style={{ color: "#FFD700", fontSize: "12px" }}
                              />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
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

      {renderPaginationControls()}
    </div>
  );
};

export default PersonalTable;
