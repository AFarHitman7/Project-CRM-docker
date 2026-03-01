// Clients.tsx
import { useState, useEffect, useCallback } from "react";
import styles from "./Home.module.css";
import { PersonalTable } from "../features/personal";
import { BusinessTable } from "../features/business";

// icons
import { IoSearchSharp } from "react-icons/io5";

const Clients = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"personal" | "business">(
    "personal",
  );

  // Debounce search: Only update debouncedSearch 500ms after user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    // Cancel the timeout if search changes (user is still typing)
    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Handle Enter key press for immediate search
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        // Immediate search on Enter
        setDebouncedSearch(search);
      }
    },
    [search],
  );

  return (
    <div className={styles.home}>
      <div className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <div className={styles.tableTabs}>
            <div
              onClick={() => {
                setActiveTab("personal");
              }}
              className={activeTab == "personal" ? styles.active : ""}
            >
              Personal Clients
            </div>
            <div
              onClick={() => {
                setActiveTab("business");
              }}
              className={activeTab == "business" ? styles.active : ""}
            >
              Business Clients
            </div>
          </div>
        </div>
        <div className={styles.homebar}>
          <div className={styles.search}>
            <input
              type="text"
              title="search"
              placeholder="Search by name, business #, contact, phone, or SIN…"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <IoSearchSharp className={styles.searchIcon} />
          </div>
        </div>
        <div className={styles.tableContainer}>
          {activeTab == "personal" && (
            <PersonalTable
              search={debouncedSearch}
              enablePagination={true}
              itemsPerPage={50}
            />
          )}
          {activeTab == "business" && (
            <BusinessTable
              search={debouncedSearch}
              enablePagination={true}
              itemsPerPage={50}
            />
          )}{" "}
        </div>
      </div>
    </div>
  );
};

export default Clients;
