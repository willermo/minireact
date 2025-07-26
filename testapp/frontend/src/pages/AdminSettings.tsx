import { createElement, useEffect, useNavigate } from "@minireact";
import { apiFetch } from "@lib/api";
import RoutesStatus from "@components/Monitoring/RoutesStatus.tsx";
import DbUsersTable from "@components/Monitoring/DbUsersTable.tsx";

export default function AdminSettings() {
  useEffect(() => {
    const navigate = useNavigate();
    const checkAdmin = async () => {
      const response = await apiFetch("api/users/isAdmin");
      const { data } = await response.json();
      if (!data.isAdmin) navigate("/");
    };
    checkAdmin();
  }, []);

  return (
    <div className="debug-page themed-bg">
      <section className="themed-card mb-4">
        <RoutesStatus />
      </section>
      <section className="themed-card mb-4">
        <DbUsersTable />
      </section>
    </div>
  );
}
