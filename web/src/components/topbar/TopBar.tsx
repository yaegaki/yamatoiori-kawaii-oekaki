import React, { Component } from "react";
import { TopBarButton } from "./TopBarButton";
import './TopBar.css';

export class TopBar extends Component {
    render() {
        return <section className="topbar">
            <TopBarButton path="/" icon="home" text="Home"/>
            <TopBarButton path="/paint" icon="pen" text="Paint"/>
            <TopBarButton path="/list" icon="image" text="List"/>
        </section>;
    }
}