import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    isStaff?: boolean;
  }

  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      /** CAC staff account (staff ID + password, not a student). */
      isStaff: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    isAdmin?: boolean;
    isStaff?: boolean;
  }
}
