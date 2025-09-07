"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import "./globals.css";
import SocketProvider from "@/components/SocketProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          <SocketProvider>{children}</SocketProvider> 
        </Provider>
      </body>
    </html>
  );
}
