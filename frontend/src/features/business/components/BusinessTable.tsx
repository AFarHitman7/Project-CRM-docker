// BusinessTable.tsx
import React from "react";
import styles from "./BusinessTable.module.css";
import { useNavigate } from "react-router-dom";
import { FaRegStar, FaStar } from "react-icons/fa";

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
  loyalty?: string;
  created_at?: string;
}

/** API Response */
interface ApiResponse {
  data: BusinessData[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
}

interface BusinessTableProps {
  search?: string;
  filterFn?: (row: Row) => boolean;
  data?: Row[];
  enablePagination?: boolean;
  itemsPerPage?: number;
}

// Headers
const headers: string[] = [
  "Name",
  "Loyalty",
  "CRA Access",
  "Business Number",
  "Phone Number",
  "Email",
  "Contact Name",
  "Fiscal Year End",
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

    const res = await fetch(`${API_URL}/api/bClient/?${params.toString()}`, {
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

    const result: ApiResponse = await res.json();
    const businesses: BusinessData[] = result.data || [];

    const rows = businesses.map((b) => {
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

      // Map data to strict array indices matching headers
      return [
        b.id, // 0: ID (Hidden)
        b.business_name || "—", // 1: Name
        b.loyalty || "—", // 2: Loyalty
        b.business_type || "—", // 3: Type
        b.business_number || "—", // 4: Business Number
        b.phone_cell || "—", // 5: Phone Number
        b.email || "—", // 6: Email
        b.contact_name || "—", // 7: Contact Name
        fiscalString, // 8: Fiscal Year End
      ];
    });

    return { rows, meta: result.meta };
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

// Sorting helper function
const getLoyaltyValue = (loyalty: string): number => {
  const normalized = loyalty;

  // Handle empty or invalid values
  if (normalized === "—" || normalized === "N/A" || normalized === "") {
    return -1; // Sort these to the end
  }

  const num = parseInt(normalized, 10);

  // Validate it's a number between 0 and 10
  if (isNaN(num)) {
    return -1; // Invalid values go to the end
  }

  return num;
};

const sortRows = (rows: Row[]): Row[] => {
  return [...rows].sort((a, b) => {
    // Sort by loyalty (index 2) - DESCENDING (10 to 0)
    const loyaltyA = getLoyaltyValue(a[2]);
    const loyaltyB = getLoyaltyValue(b[2]);

    return loyaltyB - loyaltyA; // Descending order (higher loyalty first)
  });
};

const BusinessTable: React.FC<BusinessTableProps> = ({
  search = "",
  filterFn,
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
          // Re-implementing fetch manually here for limit=0 case
          // or we could adapt getData to handle limit=0 better, but following PersonalTable pattern:
          const res = await fetch(`${API_URL}/api/bClient/?limit=0`, {
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

          const result: ApiResponse = await res.json();
          const businesses: BusinessData[] = result.data || [];

          const rows = businesses.map((b) => {
            let fiscalString = "—";
            if (b.fiscal_year_end) {
              const date = new Date(b.fiscal_year_end);
              fiscalString = date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              });
            }
            return [
              b.id,
              b.business_name || "—",
              b.loyalty || "—",
              b.business_type || "—",
              b.business_number || "—",
              b.phone_cell || "—",
              b.email || "—",
              b.contact_name || "—",
              fiscalString,
            ];
          });

          // Sort the data after fetching for client-side view
          const sorted = sortRows(rows);
          setTableData(sorted);
        }
      } catch (e: any) {
        console.error("Fetch error:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (!data) {
      fetchData();
    } else {
      // Sort provided data as well
      const sorted = sortRows(data);
      setTableData(sorted);
      setLoading(false);
    }
  }, [data, currentPage, enablePagination, itemsPerPage, search]);

  const goToBusiness = (rawId?: string | number) => {
    const id = String(rawId || "");
    if (!id) return;
    navigate(`/business/${id}`);
  };

  const normalizedSearch = String(search ?? "")
    .trim()
    .toLowerCase();

  const matchesFilters = (row: Row): boolean => {
    if (typeof filterFn === "function") return !!filterFn(row);

    if (normalizedSearch && !enablePagination) {
      // Client-side search only when pagination is disabled
      // Iterate through visible columns (indices 1 to 8)
      for (let i = 1; i < row.length; i++) {
        const cell = String(row[i] ?? "");

        // Basic text match
        if (cell.toLowerCase().includes(normalizedSearch)) return true;

        // Phone normalization (Index 5 is Phone Number)
        if (i === 5) {
          const cellNum = cell.replace(/\D/g, "");
          const searchNum = normalizedSearch.replace(/\D/g, "");
          if (searchNum && cellNum.includes(searchNum)) return true;
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
          {totalItems === 1 ? "business" : "businesses"}
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

  console.log({ currentPage, totalPages });

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.tableWrapper}>
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
                {search
                  ? `No businesses found matching "${search}"`
                  : "No businesses found"}
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
                {/* Name */}
                <td className={styles.tableCell}>{row[1]}</td>
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
                          {Number(row[2]) >= star ? (
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
                          {Number(row[2]) >= star ? (
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
                {/* Type */}
                <td className={styles.tableCell}>{row[3]}</td>
                {/* Number */}
                <td className={styles.tableCell}>{row[4]}</td>
                {/* Phone */}
                <td className={styles.tableCell}>{row[5]}</td>
                {/* Email */}
                <td className={styles.tableCell}>{row[6]}</td>
                {/* Contact */}
                <td className={styles.tableCell}>{row[7]}</td>
                {/* Fiscal Year */}
                <td className={styles.tableCell}>{row[8]}</td>
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

      {renderPaginationControls()}
    </div>
  );
};

export default BusinessTable;
