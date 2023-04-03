#!/bin/bash

# Change to the _posts directory
cd _books

# Iterate through all .md files
for file in *.md; do
  # Get the filename without the .md extension
  folder_name="${file%.md}"

  # Create a new folder with the filename
  mkdir -p "$folder_name"

  # Move the .md file to the new folder and rename it to post.md using git mv
  git mv "$file" "${folder_name}/post.md"
done

# Commit the changes
git commit -m "Moved .md files into individual folders and renamed them to post.md"
