import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Player } from "./components/Player";
import { SongMenu } from "./components/SongMenu";
import "./theme.css";
import "./fonts.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
			<Routes>
				<Route path="/" element={<SongMenu />} />
				<Route path="/song/:mapId" element={<Player />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
