import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, User2, RefreshCcw } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserModal from "./UserModal";
import Pagination from "../common/Pagination";
import { format } from "date-fns";

interface UsersViewProps {
  onDelete: (type: string, name: string, onConfirm: () => void) => void;
}

type UserListData = {
  users: User[]
  total: number
}

export default function UsersView({ }: UsersViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [limit, _] = useState(15)
  var [offset, setOffset] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  const { toast } = useToast();

  const userTableHeaders = [
    "First Name",
    "Last Name",
    "Email",
    "Role",
    "Status",
    "Last Login",
    "Update",
    "Actions"
  ]

  const getUsers = async ({ queryKey }: any) => {
    const [_key, params] = queryKey
    const response = await apiRequest("GET", 
      `/api/users?role=${params.role}&isActive=${params.isActive}&search=${params.search}&limit=${params.limit}&offset=${params.offset}`)
    const result = await response.json()
    return result
  }

  const { data: data = { users: [], total: 0}, isLoading, refetch } = useQuery<UserListData>(
    {
      queryKey: ['users', {
        role: roleFilter,
        isActive: statusFilter,
        search: searchTerm,
        limit: limit,
        offset: offset
      }],
      queryFn: getUsers
    })

  // const { data: users = [], isLoading, refetch } = useQuery<User[]>(
  //   {
  //     queryKey: ['users', {
  //       role: roleFilter,
  //       isActive: statusFilter,
  //       search: searchTerm,
  //       limit: limit,
  //       offset: offset
  //     }],
  //     queryFn: getUsers
  //   })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // const handleDelete = (user: User) => {
  //   onDelete("user", user.email, () => {
  //     deleteMutation.mutate(user.id);
  //   });
  // };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  // const handlePreview = (lesson: Lesson) => {
  //   setPreviewLesson(lesson);
  // };

  const handleNewUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === data.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(data.users.map(l => l.id));
    }
  };

  const refreshData = async () => {
    try{
      setIsRefreshing(true)
      await refetch()
      setIsRefreshing(false)
    }catch(error){
      setIsRefreshing(false)
      console.log(error)
    }
  }

  const next = () => {
    let min = offset + limit
    setOffset(Math.min(min, data.total))
    setPageNumber(pageNumber + 1)
  }

  const previous = () => {
    let max = offset - limit
    setOffset(Math.max(0, max))
    setPageNumber(pageNumber - 1)
  }

  const getActiveBadgeColor = (active: boolean) => {
    return active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-200">
        <CardContent className="p-6 space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select> */}
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button> */}
              <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                { isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button onClick={handleNewUser} className="bg-fluent-blue hover:bg-blue-600">
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium neutral-dark">
                      <Checkbox 
                        checked={data.users.length > 0 && selectedUsers.length === data.users.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    {
                      userTableHeaders.map((e) => (
                        <th key={e} className="text-left p-4 font-medium neutral-dark">
                          { e }
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="text-gray-500">
                          <User2 className="mx-auto h-12 w-12 mb-2 opacity-50" />
                          <p>No users found</p>
                          {/* <p className="text-sm">Create your first user to get started</p> */}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <Checkbox 
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            {/* <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <span className="text-lg">{IMAGE_MAP[lesson.image as keyof typeof IMAGE_MAP] || "📚"}</span>
                            </div> */}
                            <div>
                              <p className="font-medium neutral-dark">{user.firstName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                        <div className="flex items-center">
                            <div>
                              <p className="font-medium neutral-dark">{user.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                        <div className="flex items-center">
                            <div>
                              <p className="font-medium neutral-dark">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                        <div className="flex items-center">
                            <div>
                              <p className="font-medium neutral-dark">{user.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getActiveBadgeColor(user.isActive)}>
                            { user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {
                            user.lastLogin && (
                              <span className="neutral-medium text-sm">
                                { format(user.lastLogin, "PPpp") }
                              </span>
                            )
                          }
                        </td>
                        <td className="p-4">
                          <span className="neutral-medium text-sm">
                            {new Date(user.updatedAt).toLocaleDateString()}
                          </span>
                        </td>
                        {/* <td className="p-4">
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                            {user.image.charAt(0).toUpperCase() + user.image.slice(1)}
                          </Badge>
                        </td> */}
                        {/* <td className="p-4">
                          <Badge className={getLevelBadgeColor(lesson.level)}>
                            {lesson.level}
                          </Badge>
                        </td> */}
                        {/* <td className="p-4">
                          <Badge variant={getBadgeVariant(lesson.status)}>
                            {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                          </Badge>
                        </td> */}
                        {/* <td className="p-4">
                          <span className="neutral-dark font-medium">
                            {lesson.free ? "Free" : `$${((lesson.price || 0) / 100).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="neutral-medium text-sm">
                            {new Date(lesson.updatedAt).toLocaleDateString()}
                          </span>
                        </td> */}
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(user)}
                              className="fluent-blue hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handlePreview(lesson)}
                              className="neutral-medium hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(user)}
                              className="fluent-red hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button> */}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination 
                currentLength={data.users?.length ?? 0}
                limit={limit}
                offset={offset}
                pageNumber={pageNumber}
                next={next}
                previous={previous}
                total={data.total} />
          </div>
        </CardContent>
      </Card>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
      />
    </>
  );
}