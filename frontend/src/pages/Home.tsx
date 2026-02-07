import { useState, useEffect, useCallback } from "react";
import styles from "./Home.module.css";
import PersonalTable from "../features/personal/components/PersonalTable";
import Dashboard from "../features/dashboard/Dashboard";
//icons
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { BusinessTable } from "../features/business";
const API_URL = import.meta.env.VITE_API_URL || "";

interface Counts {
  personalClients: number;
  businessClients: number;
  totalClients: number;
}

const Home = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"personal" | "business">(
    "personal",
  );
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_URL}/api/dashboard/counts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

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

  const personal = counts?.personalClients ?? 0;
  const business = counts?.businessClients ?? 0;

  return (
    <>
      <div className={styles.home}>
        <div className={styles.homebar}>
          <div className={styles.search}>
            <input
              type="text"
              title="search"
              placeholder="Search by Name, Business #, or SIN... (Press Enter or wait)"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <IoSearchSharp className={styles.searchIcon} />
          </div>
          <div className={styles.buttons}>
            <a href="./add_business">
              <div className={styles.addButton}>
                <IoMdAdd />
                Add New Business
              </div>
            </a>
            <a href="./add_personal">
              <div className={styles.addButton}>
                <IoMdAdd />
                Add New Personal
              </div>
            </a>
          </div>
        </div>
        <div className={styles.dashboard}>
          <Dashboard />
        </div>
        <div className={styles.tableSection}>
          <div className={styles.tableSectionHeader}>
            <div className={styles.tableTabs}>
              <div
                onClick={() => {
                  setActiveTab("personal");
                }}
                className={activeTab == "personal" ? styles.active : ""}
              >
                Personal Clients ({personal})
              </div>
              <div
                onClick={() => {
                  setActiveTab("business");
                }}
                className={activeTab == "business" ? styles.active : ""}
              >
                Business Clients ({business})
              </div>
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
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
