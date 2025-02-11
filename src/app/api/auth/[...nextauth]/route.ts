import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';


const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${apiBaseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password,
            }),
          });

          const data = await res.json();

          if (data.success) {
            // Return user object that will be saved in the token
            return {
              id: data.userId,
              name: credentials?.username,
              // Add any other user data you want to store in the session
              status: 'Active'
            };
          }

          // If the response wasn't successful, throw an error
          throw new Error(data.error || 'Authentication failed');
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to the token when first signing in
      if (user) {
        token.id = user.id;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      // Add token data to the session
      if (session.user) {
        session.user.id = token.id;
        session.user.status = token.status;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
});

export { handler as GET, handler as POST };