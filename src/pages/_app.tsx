import type { AppProps } from "next/app";
import { useCallback, useEffect, useState } from "react";
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Navbar } from "@/components";
import { mathjax3, md } from "@/utils";
import { ProblemEditInitializedContext } from "@/hooks";
import { LayoutContext } from "@/contexts";
import { DeviceScreenType, LayoutContextType } from "@/types";
import {
  LAYOUT_DEFAULT,
  LAYOUT_THRESHOLD_DESKTOP,
  LAYOUT_THRESHOLD_TABLET,
} from "@/consts";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useAppDispatch } from "@/redux/dispatch";
import { Provider } from "react-redux";
import { store } from "@/redux";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  const [layout, setLayout] = useState<LayoutContextType>(LAYOUT_DEFAULT);
  const [initialized, setInitialized] = useState(false);

  const handleUpdateLayout = useCallback(() => {
    const { innerWidth: width, innerHeight: height } = window;

    const device: DeviceScreenType = (() => {
      if (width < LAYOUT_THRESHOLD_TABLET) return "mobile";
      if (width < LAYOUT_THRESHOLD_DESKTOP) return "tablet";
      return "desktop";
    })();

    setLayout({
      device,
      width,
      height,
    });
  }, []);

  const handleInitialize = useCallback(() => {
    window.addEventListener("resize", handleUpdateLayout);
  }, [handleUpdateLayout]);

  useEffect(() => {
    handleInitialize();
  }, [handleInitialize]);

  useEffect(() => {
    md.use(mathjax3);
  }, []);

  return (
    <>
      <style jsx global>{`
        #__next > *:not(.icon) {
          font-family: ${inter.style.fontFamily}!important;
        }
      `}</style>
      <Provider store={store}>
        <ProblemEditInitializedContext.Provider
          value={[initialized, setInitialized]}
        >
          <LayoutContext.Provider value={layout}>
            <div className="relative h-full flex flex-col flex-auto overflow-x-hidden">
              <Navbar />
              <Component {...pageProps} />
            </div>
          </LayoutContext.Provider>
        </ProblemEditInitializedContext.Provider>
      </Provider>
    </>
  );
}
