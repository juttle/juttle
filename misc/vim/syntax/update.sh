echo 'cat <<END_OF_TEXT' >  temp.sh
cat juttle.vim.tmpl      >> temp.sh
echo 'END_OF_TEXT'       >> temp.sh
bash temp.sh > juttle.vim
rm temp.sh
