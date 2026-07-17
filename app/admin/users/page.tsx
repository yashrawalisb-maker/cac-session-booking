import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewUserDialog } from "@/components/admin/new-user-dialog";
import { UsersCsvUpload } from "@/components/admin/users-csv-upload";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Roster</h1>
          <p className="text-sm text-muted-foreground">{users.length} user(s)</p>
        </div>
        <NewUserDialog />
      </div>

      <UsersCsvUpload />

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ISB email</TableHead>
              <TableHead>PGP ID</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Study group</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.isbEmail}</TableCell>
                <TableCell>{u.pgpId}</TableCell>
                <TableCell>{u.section ?? "—"}</TableCell>
                <TableCell>{u.studyGroup ?? "—"}</TableCell>
                <TableCell>
                  {u.isAdmin ? <Badge>Admin</Badge> : <Badge variant="outline">User</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
