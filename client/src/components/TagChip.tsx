import * as React from 'react';
import PropTypes from 'prop-types';
import { Avatar, Chip } from 'react-md';

export default class TagChip extends React.PureComponent<any, any> {
  static propTypes = {
    state: PropTypes.shape({
      name: PropTypes.string.isRequired,
      abbreviation: PropTypes.string.isRequired,
    }).isRequired,
    onClick: PropTypes.func.isRequired,
  };

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
