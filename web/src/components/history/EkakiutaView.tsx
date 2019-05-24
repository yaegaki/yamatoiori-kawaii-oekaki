import React, { Component } from "react";
import { Ekakiuta } from "../../models/Ekakiuta";
import { VivusView } from "../common/VivusView";
import { ExpansionPanelSummary, Typography, ExpansionPanelDetails, Menu, MenuItem, ListItem, ListItemText, List } from "@material-ui/core";
import { ExpansionPanel } from "@material-ui/core";
import { ArrowDropDown, ExpandMore } from "@material-ui/icons";

import './EkakiutaView.css';
import { VivusAnimationView } from "../common/VivusAnimationView";

type EkakiutaViewProps = {
    ekakiuta: Ekakiuta;
    file: string;
}

type EkakiutaViewState = {
    answerVisible: boolean;
    anchorElem?: HTMLElement;
    selectedIndex: number;
    answerExpanded: boolean;
}

export class EkakiutaView extends Component<EkakiutaViewProps, EkakiutaViewState> {
    constructor(props: EkakiutaViewProps) {
        super(props);

        this.state = {
            answerVisible: false,
            answerExpanded: false,
            selectedIndex: 0,
        };
    }

    render() {
        const { ekakiuta, file } = this.props;
        const { answer, lyrics } = ekakiuta;
        return <section className="ekakiuta">
            {lyrics.length > 1 ? 
                <List>
                    <ListItem button={true}>
                        <ListItemText primary={<span className="lyric-list">{`${this.state.selectedIndex+1}回目`}<ArrowDropDown/></span>} onClick={this.onLyricMenuClick}/>
                    </ListItem>
                </List> : ''
            }
            <Menu
                anchorEl={this.state.anchorElem}
                open={this.state.anchorElem !== undefined}
                onClose={this.onLyricMenuClose}>
                {this.renderMenuItems(lyrics.length)}
            </Menu>
            <Typography className="lyric">
                {this.renderLyric(lyrics[this.state.selectedIndex])}
            </Typography>
            <ExpansionPanel onChange={this.onAnswerExpansionChange}>
                <ExpansionPanelSummary expandIcon={<ExpandMore/>}>
                    <Typography className="answer-header">正解を見る</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className="answer">
                    <div className="vivus-container">
                        {this.state.answerExpanded ? <VivusAnimationView file={file}/> : ''}
                    </div>
                    <div className="answer-title">{answer}</div>
                </ExpansionPanelDetails>
            </ExpansionPanel>
        </section>;
    }

    private renderMenuItems(count: number) {
        const result: any[] = [];
        for (let i = 0; i < count; i++) {
            const _i = i;
            const r = <MenuItem
                key={i}
                onClick={() => this.setState({...this.state, anchorElem: undefined, selectedIndex: _i})}
                selected={this.state.selectedIndex == i}
                >
                    {i+1}回目
            </MenuItem>;
            result.push(r);
        }
        return result;
    }

    private renderLyric(lyric: string) {
        const result: any[] = [];
        const xs = lyric.split('\n');
        for (let i = 0; i < xs.length; i++) {
            if (i > 0) result.push(<br key={`${i}-br`}/>);
            result.push(xs[i]);
        }

        return result;
    }

    private onLyricMenuClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        this.setState(prevState => {
            return {
                ...prevState,
                anchorElem: target,
            }
        });
    }

    private onLyricMenuClose = () => {
        this.setState(prevState => {
            return {
                ...prevState,
                anchorElem: undefined,
            }
        });
    }

    private onAnswerExpansionChange = (event: React.ChangeEvent<{}>, expanded: boolean) => {
        this.setState(prevState => {
            return {
                ...prevState,
                answerExpanded: expanded,
            };
        });
    }
} 