import React, { Component, ChangeEvent, FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './SearchBox.css';

type SearchBoxProps = {
    value: string;
    placeholder?: string;
    onSubmit: () => void;
    onChange: (value: string) => void;
}

export class SearchBox extends Component<SearchBoxProps> {
    constructor(props: SearchBoxProps) {
        super(props);

        this.onChange = this.onChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }

    render() {
        return <form className="searchbox" onSubmit={this.onSubmit}>
            <div className="searchbox-container">
                <input type="text" value={this.props.value} onChange={this.onChange} placeholder={this.props.placeholder}/>
                <button><FontAwesomeIcon icon="search"/></button>
            </div>
        </form>;
    }

    private onChange(e: ChangeEvent<HTMLInputElement>) {
        this.props.onChange(e.currentTarget.value);
    }

    private onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        this.props.onSubmit();
    }
}