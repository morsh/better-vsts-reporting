import * as React from 'react';
import { Avatar, Chip } from 'react-md';

interface IProps {
  tag: string;
  onClick: (tag: string) => void;
}

export default class TagChip extends React.PureComponent<IProps, any> {

  handleRemove = () => {
    this.props.onClick(this.props.tag);
  }

  render() {
    const { tag, ...props } = this.props;
    
    return (
      <Chip
        {...props}
        onClick={this.handleRemove}
        removable={true}
        label={tag}
        avatar={<Avatar random={true}>{tag.charAt(0)}</Avatar>}
      />
    );
  }
}
