import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import './Loading.css';

export class Loading extends Component {
    render() {
        return <div className="loading"><FontAwesomeIcon icon="circle-notch" spin size="4x"/></div>;
    }
}