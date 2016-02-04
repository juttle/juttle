export CWD=`dirname "$0"`
echo 'cat <<END_OF_TEXT' >  temp.sh
cat $CWD/juttle.vim.tmpl >> temp.sh
echo 'END_OF_TEXT'       >> temp.sh
bash temp.sh > $CWD/juttle.vim
rm temp.sh
