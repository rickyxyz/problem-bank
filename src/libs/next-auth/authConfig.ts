import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions, NextAuthOptions } from "next-auth";
import { firebaseAdmin } from "@/libs/firebase/admin";
import { api } from "@/utils/api";
import { API } from "@/api";
import NextAuth from "next-auth/next";

export const authConfig: AuthOptions = {
  // https://next-auth.js.org/configuration/providers
  providers: [
    CredentialsProvider({
      credentials: {},
      authorize: async ({ idToken }: any, _req) => {
        if (idToken) {
          try {
            const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
            const user = await API("get_user", {
              params: {
                uid: decoded.uid,
              },
            });
            console.log("USER");
            console.log(user);

            if (user && user.data.id && user.data.role) {
              decoded.username = user.data.id;
              decoded.role = user.data.role;
              return { ...decoded } as any;
            }

            throw Error("fails");
          } catch (err) {
            console.error(err);
          }
        }
        return null;
      },
    }),
  ],

  // The secret should be set to a reasonably long random string.
  // It is used to sign cookies and to sign and encrypt JSON Web Tokens, unless
  // a separate secret is defined explicitly for encrypting the JWT.
  secret: process.env.SECRET,

  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `jwt` is automatically set to `true` if no database is specified.
    // jwt: true,
    strategy: "jwt",
    // Seconds - How long until an idle session expires and is no longer valid.
    // maxAge: 30 * 24 * 60 * 60, // 30 days

    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // JSON Web tokens are only used for sessions if the `jwt: true` session
  // option is set - or by default if no database is specified.
  // https://next-auth.js.org/configuration/options#jwt
  jwt: {
    // A secret to use for key generation (you should set this explicitly)
    secret: process.env.SECRET,
    // Set to true to use encryption (default: false)
    // encryption: true,
    // You can define your own encode/decode functions for signing and encryption
    // if you want to override the default behaviour.
    // encode: async ({ secret, token, maxAge }) => {},
    // decode: async ({ secret, token, maxAge }) => {},
  },

  // You can define custom pages to override the built-in ones. These will be regular Next.js pages
  // so ensure that they are placed outside of the '/api' folder, e.g. signIn: '/auth/mycustom-signin'
  // The routes shown here are the default URLs that will be used when a custom
  // pages is not specified for that route.
  // https://next-auth.js.org/configuration/pages
  pages: {
    signIn: "/auth/signin", // Displays signin buttons
    // signOut: '/auth/signout', // Displays form with sign out button
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // Used for check email page
    // newUser: null // If set, new users will be directed here on first sign in
  },

  // Callbacks are asynchronous functions you can use to control what happens
  // when an action is performed.
  // https://next-auth.js.org/configuration/callbacks
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt: async ({ token, user }: any) => {
      // If successfully sign in, keep Firebase Authentication user info
      // in JWT payload
      if (user) {
        token = user;
      }
      return token;
    },
    session: async ({ session, token }: any) => {
      if (session?.user) {
        const { username, role } = token;
        console.log("Session User");
        // console.log(token);
        session.user = {
          id: username,
          role,
        };
      }
      return session;
    },
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events
  events: {},

  // Enable debug messages in the console if you are having problems
  debug: process.env.NODE_ENV !== "production",
};

const handler = NextAuth(authConfig);

export const { auth } = handler;
