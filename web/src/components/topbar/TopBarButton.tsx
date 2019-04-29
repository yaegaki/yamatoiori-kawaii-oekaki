import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { NavLink } from "react-router-dom";


export type TopBarButtonProps = {
    path: string;
    icon: IconProp;
    text: string;
}

export class TopBarButton extends Component<TopBarButtonProps> {
    render() {
        return <NavLink to={this.props.path} className="link" activeClassName="active" exact={true}>
            <FontAwesomeIcon icon={this.props.icon}/>
            <span className="text">{this.props.text}</span>
        </NavLink>;
    }
}